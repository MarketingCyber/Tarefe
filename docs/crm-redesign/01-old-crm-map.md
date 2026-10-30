# Old CRM map — what Dynamics 365 does today

Read-only survey of Tarefe's current CRM, done 2026-10-30 with the owner's own CRM login. Nothing in the CRM
was changed. Purpose: the starting point for building the new CRM inside tarefe.de. The full step-by-step list of
every automation is in [02-old-crm-automations.md](02-old-crm-automations.md).

## 1. The system

| | |
|---|---|
| Product | Microsoft Dynamics 365 **on-premise, version 9.1.36**, organisation `Tarefe` |
| Address | `tarefe.online/Tarefe` (Windows domain `PIDOLINK`, server `WIN-3V326L7OVJA`) |
| Sign-in | Windows (NTLM). Web API `…/api/data/v9.1/` works over **plain http** too — security issue for the CRM team |
| Apps | one model-driven app "CRM" (+ the Outlook add-in) |
| Size | 581 tables (≈40 built for Tarefe), 388 active automations, 12 own plugin assemblies |
| Vendor | **BayatSoft** built parts of it (BayatSoft.MSCRM, notifications, WhatsApp, Fulmakht/Vollmacht) |

Not readable with the owner's role (would need a read-only role from the CRM team): webhooks/service endpoints,
solutions, finance transactions (`new_finance_record`), emails, phone calls, tasks, chatbots.

## 2. The data (records on 2026-10-30)

| Business object | CRM table | Records | Notes |
|---|---|---:|---|
| Customer (person) | `contact` | 6,836 | login fields, customer level (bronze/silver/gold), referral link, flags "has gas/electricity", "has dental" |
| Provider / company | `account` | 10,795 | insurers, energy suppliers, telcos; logo URL |
| **Contract** | `opportunity` | 27,383 | the heart of the CRM: category, stage (*Angebot* = offer, *AktuellT* = active contract), dates, provider portal, commission |
| **Ticket** | `incident` | 25,002 | customer conversations; replies are notes |
| Lead | `lead` | 8,001 | requests from the site; becomes a contract |
| Notes & files | `annotation` | 100,750 | ticket replies, uploaded documents, generated PDFs |
| Points (loyalty / referral) | `new_points` | 18,884 | with statuses: waiting for contract, waiting for review date, gift code assigned, cancelled |
| Gift codes | `new_gift_code` | 5 | bulk-imported via a note attachment |
| Counselling details | `new_counselor_info` | 1,964 | |
| Received letters | `new_receive_letter` | 818 | scanned post, matched to customer + contract |
| Generated letters | `new_generate_letter` | 131 | cancellation letters etc. |
| Letter types (catalogue) | `new_tarefe_leters` | 103 | multilingual (fa, de, ar, ru, tr, en, ku) |
| Children / businesses | `new_children` / `new_customer_business` | 328 / 132 | family members, self-employed businesses (with IBAN) |
| Customer signatures | `new_customer_sign` | 99 | sign-link flow via signature.tarefe.de |
| Power of attorney | `bsfulm_fulmakht` | — | *Vollmacht* PDF generated from customer data |
| Contract portals | `new_contract_company` | 19 | where a contract is closed (e.g. Maxpool) |
| Categories | `new_category` | 44 | product tree, 7 languages |
| Message templates | `new_message_template` | 187 | texts for emails / ticket messages / point topics |
| Internal notifications | `bsnotif_notification` | 4,775 | alerts for staff |
| WhatsApp messages | `bs_whatsapp` | 49 | sent from the CRM |
| FAQ | `new_faq` | 61 | |
| Staff users | `systemuser` | 55 | with "on leave → substitute" rule |
| Sync queue | `new_sitesyncer` | — | every change waiting to be pushed to the old site |

## 3. How it works — the main flows

### 3.1 Everything is mirrored to the old site (the "syncer")
For contacts, accounts, contracts, tickets, leads, notes, points, children, businesses, categories, letter types,
portals, staff users and emails, a workflow fires **on create, on change of listed fields, and on delete**, and writes
a row into `new_sitesyncer`. A second workflow on that row runs `TarefeSiteSyncer.SendDataToSite`, which calls the
old server's `/crm/v1/...` endpoints (the 56 routes on api.tarefe.de). This is how the old app/site gets its data.
→ **In the new CRM this whole layer disappears**: the CRM and the site/app share one database.

### 3.2 Lead → customer → contract
1. A request arrives from the site → **lead**: lower-case the email, find an existing customer by email/phone
   (`FindAndFillContactInLead`), assign to that customer's owner, notify the owner (`bsnotif_notification`,
   with "user on leave → substitute"), send the confirmation email.
2. Lead qualified → **contact** (+ business record if self-employed).
3. New contact: lower-case email, block duplicate emails, generate **site username/password** (stored in the CRM),
   build the referral link `tarefe.de/referral/…`, create the "registered" points record, welcome ticket.
4. **Contract (opportunity)** created — from the CRM, the site or the app:
   - owner set (app-created ones re-assigned), copy customer + provider addresses, fill dates
     (start, end, cancellation deadline = 2 months before end, modem return, *VVL* 17 months before end, eVB date),
   - commission (`new_commision_amount`) and **operator points** (`EvalOperatorPoint`, staff gamification),
   - a **ticket** is opened for the contract (one conversation per contract), welcome/guide email by category
     (with PDF guides from cdn.tarefe.de),
   - an "Angebot" (offer) from the site also creates a lead; offers untouched for 2 months → lost automatically,
   - colour code by energy code, VIP check, "has gas/electricity / dental" flags on the customer.

### 3.3 Contract life cycle (stages + status)
- Stage changes (`new_step`) drive everything: *Angebot* → *AktuellT* (active). Previous stage is kept.
- Status reasons when closing: Won; lost **because of cancellation, replacement contract, customer complaint, bad
  payer, one-sided cancellation, expired without review**.
- Rules: an *AktuellT* contract can't be "won" before 3 months; cancellation date stored; contract renewal
  (`new_parent_opportunity`) creates loyalty points.
- **Deadlines** create tasks for the advisor: cancellation deadline reached (+ generates the cancellation letter
  PDF), modem return date, end date, 1 month before end ("re-advise"), Maxpool portal check after 1 month.
  These are "called by other processes" — the scheduler that triggers them isn't visible with this role
  (probably the `new_control_task_run` table / Ultimate Workflow Toolkit).

### 3.4 Tickets (customer conversations)
- Ticket statuses: new · answered · waiting for reply · finished · closed · trash.
- **Replies are notes**: when staff add/edit a note, status flips to "answered", the note header is updated and it is
  pushed to the site; customer notes set "waiting for reply".
- Follow-up date reached → ticket reopens with a "review" banner; closed tickets → "finished" after 2 months.
- **AI helpers (the "bots")**: `Action_Get_3_Answer_Case` (3 suggested answers), `Action_Translate_Case_Response`,
  `Action_Translate_Case_To_User_Language` — all call the old server's `/crm/v1/ai/...`, which uses **Google Gemini**.

### 3.5 Points, levels, gifts (loyalty + referral)
- Points are created for: registering, an active *AktuellT* contract, a contract renewal, **referring someone**
  (pending until the referred person has a contract, then a review date, then active).
- Any change recalculates the customer's total (rollup) and **customer level bronze / silver / gold**
  (`EvalCustomerType_NewVersion`) and gamification, then pushes to the site.
- "Settled = yes" → status "gift code assigned"; a task goes to the staff member who sends gift codes.
- Lost/deleted contracts remove their points; duplicate points are blocked.

### 3.6 Documents & letters
- **Cancellation letter** (*Kündigung*): PDF generated from the contract (`Opportunity_GetCancelLetterAsPdf`, full and
  short versions), attached as a note, emailed and pushed to the site.
- **Power of attorney** (*Vollmacht / Fulmakht*): created from site data → finds or creates the customer → PDF → note
  → site.
- **Received post**: uploaded letter is matched to customer and contract (`HandelRecevieLetter`) and can be
  attached to the contract.
- **Customer signature**: generates a sign link (signature.tarefe.de); task for staff one hour after signing.
- Excel upload handler (`TB_Upload.HandleExcelFile`) for bulk imports.

### 3.7 Staff side
- Task subjects auto-filled; postponing a task is counted (`new_count_postpon`).
- Notifications to staff (`bsnotif_notification`) with business rules per type (lead, ticket, contract, task…).
- "User on leave" → work goes to the substitute (`User_Check_User_Or_Replace`).
- WhatsApp messages sent from the CRM (`Bs_Whatsapp.SendMessage`).
- Customer delete request → task for staff.

## 4. Custom code inside the CRM (what we'd rewrite)

| Area | Code (assembly: class) | What it does |
|---|---|---|
| Contracts | Tarefe: `Opportunity_FillDates`, `Opportunity_Check_User_Is_Vip`, `ResetPointWhenOppLost`, `Opportunity_CloseAsLost_RemovePoint`, `Opportunity_Delete_RemovePoint`, `CheckSomeoneIntroduceOppCustomer` · TarefeBusiness2: `EvalOperatorPoint`, `PreventWonOppLessThanXMonth`, `Delete` | dates, VIP, points, commission rules |
| Letters / PDFs | Tarefe & TB_Report: `Opportunity_GetCancelLetter(Full/Generate)AsPdf`, `FulmakhtReportAsPdf`, `VollmachtReportAsPdf` | PDF generation |
| Customers | TarefeBusiness2: `PreventInsertDuplicateContactByEmail`, `Has_Gas_Strom_Contract`, `Has_Dentis_Contract`, `UserHas_En_In_Te`, `IsUserActive_HasAktuellT`, `Opportunity_AktuellT_Active_Count`, `Contact_Gamefication`, `EvalCustomerType_NewVersion`, `ContactDelete` · Tarefe: `Contact_GetByIdentificationCode`, `Contact_IsActive` | flags, levels, gamification |
| Leads | TarefeBusiness2: `FindAndFillContactInLead` | match lead to customer |
| Points | Tarefe: `Point.ControlDuplicate`, `CheckContactCanIntruduceSomeone2` | referral rules |
| Notes / tickets | Tarefe: `Note_Copy`, `Note_Attach_File`, `Note_Attachment_Bulk_Gift_Code` · TarefeBusiness2: `Update_Note_Header`, `FindLastCaseForOpportunity`, `TakeNoteAndReturnFirstLink` | ticket replies, files |
| Templates | Tarefe: `GetTemplateMessage(TakeArray)` | fills message templates |
| Site sync + AI | TarefeSiteSyncer: `SendDataToSite`, `Create_SiteSyncer_All_*`, `SendNoteFileAndTakeFileUrl`, `CreateCustomerSign`, `DeleteCustomerSign`, `AI.SuggetAnswer`, `AI.TranslateAnswer`, `AI.TranslateHistory` | push to old server, signatures, AI |
| Other | TB_Upload: `HandleExcelFile` · Bs_Whatsapp: `SendMessage` · TarefeBusiness2: `HandelRecevieLetter`, `GetLastSiteSettingRecord` · BayatSoft.MSCRM: rollups, clone record, random numbers, date helpers | |

We can see *which* code runs and *when*, but not the C# inside. Exact formulas (operator points, customer level,
commission) need either the source from BayatSoft/the CRM team, or to be re-derived from the data.

## 5. What this means for the new CRM (first thoughts, to discuss)

1. **Drop the sync layer** — one database for CRM, website and app (already the case in tarefe.de).
2. Core objects map well onto what tarefe.de already has: Customer (contact), Provider (account), Contract
   (opportunity), Ticket/Conversation (incident, one per contract — the app already works this way), Lead,
   Documents (annotation), Points/Referral, Notifications, Tasks.
3. Re-implement as code in tarefe.de: the date rules, deadline tasks (a real scheduler), points/levels,
   PDF letters, received-post matching, signature links, AI reply helpers, WhatsApp.
4. **Don't carry over**: site passwords stored in the CRM (`new_username` / `new_password` — insecure), the http
   connection, the many disabled/"استفاده نشود" (do-not-use) tables.
5. Data migration later: 6.8k customers, 27k contracts, 25k tickets, 100k notes/files, 19k points.

## 6. Open questions for the CRM team / BayatSoft
- Read-only role covering webhooks, solutions, finance transactions, emails, phone calls, tasks.
- What triggers the scheduled ("called by other processes") deadline workflows?
- C# source (or a description) of the custom code in §4, especially points, customer level, commission.
- Who uses the Outlook add-in, and which reports matter (TB_Report)?
