# New CRM — data model proposal (draft 2, 2026-10-30)

Built from the old CRM survey ([01-old-crm-map.md](01-old-crm-map.md)) plus field-usage counts over the real data
(how often each old field is actually filled). Target: the existing tarefe.de database (Prisma/Postgres), so the
CRM, the website and the app share one database and the old "site syncer" layer disappears.

**Owner's rule (2026-10-30): keep everything.** Every field, label, choice list, stage and status of the old CRM is
kept, so operators recognise every screen; fields the old CRM hides («استفاده نشود») are kept and hidden. The two
CRMs run in parallel and stay synced until the switch ([04-migration-plan.md](04-migration-plan.md)).

How it is stored (operators don't see this):
1. Common fields are real columns. Product-specific fields (car, phone, household, dental…) are kept field by field in
   a `details` record per contract, under their old names, so nothing is lost and the sync stays one-to-one.
2. Values the old CRM calculates (has-energy flags, active contract count, points total, customer level) are synced
   as they are during the parallel run; the new CRM recalculates them itself only after the switch, and the
   reconciliation report shows any difference.
3. Old "date email/task was sent" fields are kept, and also logged in `AutomationRun` for the new automations.
4. Site usernames/passwords stored in the old CRM are the one exception: they are not copied (security); customers
   sign in with the email code. Everything else is.

## 1. People

### Customer = `User` (role CUSTOMER) + `CustomerProfile` (new, 1:1)
`User` stays the login identity (email, name, phone, locale). Everything CRM-specific moves to a profile so staff
accounts stay clean. Old: `contact`, 6,854 records, 56 of 102 fields used.

| Field | From old | Used | Notes |
|---|---|---:|---|
| customerNumber | `new_customernumber` | 100% | keep the old numbers |
| motherLanguage | `new_motherllanguage` | 100% | fa · ku · ru/uk · ar · de · tr · en |
| firstName / lastName / gender / birthdate | standard | | |
| street, houseNumber, postalCode, city, country | `new_strasse`… | ~68% | |
| iban, bic | `new_iban`, `new_bic` | 55% / 4% | **encrypt at rest** |
| maritalStatus, familySize, jobType, nationality | | 20% / 8% / 8% / 17% | |
| partnerBirthdate, spouseEmail, spousePhone | | 15% / 4% / 4% | |
| accountType | `new_accounttype` | 25% | private · business |
| howFound | `new_nahvehashnaee` | 49% | ads · site · staff referral · customer referral · Instagram · door-to-door · email · phone · inbound call · YouTube · WhatsApp · Telegram · other |
| referralCode / referredById | `new_id`, `new_representator` | 81% / 11% | `User.referralCode` already exists |
| owner (advisor) | `ownerid` | 100% | + `previousOwnerId` |
| firstSiteLoginAt, activeSince, inactiveSince | | 42% / 35% / 37% | |

All other fields are kept as well (see the rule above), including the calculated flags and campaign dates; only
`username`/`password` are not copied.

### `FamilyMember` (old `new_children`, 328) and `CustomerBusiness` (old `new_customer_business`, 132)
Children: name, birthdate. Business: name, address, email, IBAN (self-employed customers' second address).

### Staff = `User` (ADVISOR/ADMIN/…), plus `onLeave` and `substituteId`
Old rule "user on leave → work goes to the substitute" (`User_Check_User_Or_Replace`).

## 2. Providers and products

### `Provider` (old `account`, 10,795 — almost only name + address)
name, street, postalCode, city, country, logoUrl. `Contract.provider` (today free text) becomes a relation, with
the text kept for display. Cancellation letters use the provider's address.

### `ContractPortal` (old `new_contract_company`, 19)
Where a contract is closed: Maxpool, Check24, Verivox, Tarifcheck, Fondsfinanz, O2, 1&1, ADAC, Aklamio, …

### Categories
The old 44 categories (insurance 37, telecom 2, finance 2, energy 2, other) map onto the site's taxonomy
(`src/lib/taxonomy.ts`) — one product tree for site, app and CRM. A mapping table is part of the migration.

## 3. Contracts — `Contract` (old `opportunity`, 27,383)

Usage over all 27,505 contracts: 171 custom fields — 63 used in ≥5% of contracts, 57 rarely, 37 never (all kept).
Stage: Aktuell T 13,604 · Angebot 11,984 · Aktuell 1,687 · empty 230. Outcome: lost 13,450 (11,213 of them
"expired without review" — the 2-month offer rule) · won 7,192 · open 6,863. Created via: CRM 25,686 · app 1 ·
empty 1,818. Top products: car insurance 7,773 · electricity 5,735 · dental 4,035 · GKV 1,761 · legal protection
1,321 · liability 1,291 · SIM/phone 1,129. Portals: none 13,418 · Fondsfinanz 3,723 · Tarifcheck 3,021 · Maxpool 1,311
· Energiespardienst24 1,253 · ADAC 950 · Stromkreis 947 · Neue Energie 828 · Nafi 824 · O2 602 · Check24 379.
Term: 12 months 21,189 · 24 months 3,540 · other 1,753. Payment: monthly 10,580 · yearly 3,172 · quarterly 1,075 ·
half-yearly 684 · empty 11,994.

Common columns:
- **stage**: OFFER (*Angebot*) · ACTIVE_T (*Aktuell T*, contract running with Tarefe) · ACTIVE (*Aktuell*) · ENDED (*Ende*); `previousStage`
- **outcome**: OPEN · WON · LOST, with **endReason**: cancelled · expired · replaced by another contract · customer complaint · bad payer · one-sided cancellation · expired without review
- customer, owner (advisor), provider, portal, category/product, `createdVia` (CRM · site · app · Telegram · email)
- numbers: contract number (*Vertragsnummer*), customer number at provider (*Kundennummer*), order number (*Auftragsnummer*), reference number, insurance number
- dates: start, end, cancellation deadline (default 2 months before end), cancelled on, sold on, switch possible (*tavizdate*), VVL (17 months before end), modem return
- money: amount + payment interval (monthly / quarterly / half-yearly / yearly), term (12/18/24/36/48 months, open-ended, other)
- commission: amount, paid, "never pay commission", bonus deduction, tariff-check status (open · paid · cancelled)
- operator points (staff gamification)
- parent contract (renewal / replacement)
- energy: colour status (*übermittelt · Wechselprozess · Klärfall · geschafft · Storno*), market location ID, meter number, annual consumption, network operator
- **details JSON** for everything product-specific (vehicle, phone/SIM, household, animal, dental, loan…)

## 4. Conversations and tickets

Old `incident` (25,124; 81% linked to a contract; all but 3 closed) → the existing `Conversation` (one per
customer + contract, already used by the app), plus: `status` (new · answered · waiting for reply · finished ·
closed · trash), `ticketNumber`, `title`, `followUpAt` ("review" banner), category.
Old notes (`annotation`, 100,750) split into: customer-visible **messages**, **internal notes** (staff only, new
`InternalNote`) and **files** (`Document`). Measured: 101,483 notes (0.7 GB of files) — contracts 61,420 text + 520 files · tickets 16,746 text + 9,692 files ·
customers 5,199 · emails 4,074 · leads 1,959 · received letters 804 files.
AI helpers (3 suggested replies, translate reply, translate history) become server functions on the conversation.

## 5. Loyalty — `PointEntry` (old `new_points`, 18,983) and `GiftCode`

| Type (old) | Records | Typical points |
|---|---:|---:|
| register | 7,457 | 200 |
| per contract | 6,071 | 200 |
| one year of loyalty | 3,200 | 400 |
| referred a friend | 813 | 400 |
| contract renewal | 716 | — |
| was referred | 543 | 200 |
| energy + telecom + insurance complete | 146 | — |
| gift code | 24 | — |
| RE-HR-HP complete | 9 | — |
| referred 3 customers | 4 | — |

PointEntry: customer, type, points, status (waiting for contract · waiting for review date · active · gift code
assigned · cancelled), contract?, referredCustomer?, reviewDate, settled, giftCode?. Level bronze/silver/gold is
computed from the active total. Rules (amounts, levels) live in one config, not scattered in workflows.

## 6. Leads — existing `Lead`, extended (old `lead`, 8,018)
Add: status flow (registered · not answered yet · contacted · in review · converted · closed) + **rejection reason**
(wrong number · request was from an existing customer · no answer / duplicate · unrelated question · didn't know
why they signed up), matched customer, converted contract, mother language, address. Attribution fields (UTM,
gclid) already exist.

## 7. Documents, letters, signatures
- `Document` (exists): files on customer / contract / conversation.
- `LetterTemplate` (old `new_tarefe_leters`, 103, 7 languages) and `GeneratedLetter` (cancellation letter,
  power of attorney *Vollmacht*, others) — PDF made by the server.
- `ReceivedLetter` (old `new_receive_letter`, 818): scanned post, matched to customer + contract.
- `SignatureRequest` (old `new_customer_sign`, 99): link, signed at.
- `MessageTemplate` (old, 187): texts for emails, chat messages and point topics, per language.

## 8. Work and messaging
- `Task` (exists) + `type` (birthday follow-up, received letter, commission check, missing contract number,
  signature, cancellation deadline, modem return, re-advise before end, …) + postponed count.
- `Notification` (exists) for customers; staff alerts reuse it with a staff recipient.
- `WhatsAppMessage` (old `bs_whatsapp`, 49) — log of messages sent.
- `CounselingNote` (old `new_counselor_info`, 1,964) — advice sessions.
- `AutomationRun` (new) — every automatic action with record + time; replaces the old "date sent" fields.

## Not carried over
Only the stored site passwords. Microsoft's own built-in tables (Sales Insights, AI Builder…) are not Tarefe data.

## Open decisions
1. Customers without an email (old contacts may have only a phone) — `User.email` is required today.
2. Keep old customer numbers and ticket numbers as-is? (proposal: yes)
3. IBAN: store at all? (proposal: yes, encrypted, staff-only)
4. Migrate closed tickets' full history, or only the last 2 years?
5. Points rules: confirm amounts per type and level thresholds (old code isn't readable).
