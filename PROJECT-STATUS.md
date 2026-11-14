# Tarefe — project status

**The single place that explains everything about the Tarefe project: what is built and live, what is being built, and
what comes next.** Updated with every change (see [Keeping this file current](#keeping-this-file-current)); the
[changelog](#changelog) at the end records each update.

Last updated: **2026-11-14**

---

## Contents

1. [What Tarefe is](#1-what-tarefe-is)
2. [The systems at a glance](#2-the-systems-at-a-glance)
3. [Where everything lives](#3-where-everything-lives)
4. [Website (tarefe.de) — built and live](#4-website-tarefede--built-and-live)
5. [Tracking, analytics and marketing — built and live](#5-tracking-analytics-and-marketing--built-and-live)
6. [Customer portal (/app) — built and live](#6-customer-portal-app--built-and-live)
7. [New CRM (/ops) — built and live](#7-new-crm-ops--built-and-live)
8. [Old CRM (Dynamics 365) integration](#8-old-crm-dynamics-365-integration)
9. [Mobile app — built, not published](#9-mobile-app--built-not-published)
10. [Infrastructure, deploys and backups](#10-infrastructure-deploys-and-backups)
11. [In progress right now](#11-in-progress-right-now)
12. [Plan for the future](#12-plan-for-the-future)
13. [Waiting on other people](#13-waiting-on-other-people)
14. [Owner's rules and decisions](#14-owners-rules-and-decisions)
15. [Known issues and risks](#15-known-issues-and-risks)
16. [How to work on the project](#16-how-to-work-on-the-project)
17. [Detailed documents](#17-detailed-documents)
18. [Keeping this file current](#keeping-this-file-current)
19. [Changelog](#changelog)

---

## 1. What Tarefe is

Tarefe (تعرفه) is a German insurance and energy brokerage for Persian-speaking (and Russian / German-speaking)
people in Germany. All services are free for the customer; Tarefe earns commission from providers. Customers get a
personal, Persian-speaking advisor who compares offers, closes contracts and handles the paperwork (cancellations,
claims, changes) for them.

**Business goals of the platform**
- **Website**: bring in new customers (Google Ads, Meta, organic), explain services in Persian, compare, and turn
  visitors into qualified consultation requests (leads).
- **CRM**: one place where staff manage customers, contracts, deadlines, tickets, leads and tasks. Today this is
  the old **Dynamics 365** CRM; a **new CRM** is being built inside the website's back office (`/ops`) and runs
  in parallel until it can replace Dynamics.
- **Mobile app**: existing customers see all their contracts, documents and support in one place, get reminders and
  can refer friends. The old app is still live; a new Expo app is built and waiting for launch.

## 2. The systems at a glance

| System | What it is | Status |
|---|---|---|
| **tarefe.de** (new website) | Next.js 16 site in Persian / German / Russian, with the customer portal (`/app`) and the staff back office / new CRM (`/ops`) | ✅ live |
| **New CRM** (`tarefe.de/ops`) | staff workspaces built on a live mirror of Dynamics + the website's own data | ✅ live, read + first write actions (test mode) |
| **Old CRM — Dynamics 365** (`tarefe.online/Tarefe`) | on-premise Dynamics 365 9.1, today's **system of record** for customers, contracts, tickets | live, run by the CRM developer (BayatSoft) |
| **Old site bridge** (`api.tarefe.de`, `panel.tarefe.de`, `cdn.tarefe.de`) | old Node.js server + PHP panel + file CDN behind the old app; syncs with Dynamics | live, to be retired |
| **Old mobile app** | the app customers use today (iOS v1.8.6, Android 1K+ installs) | live, to be replaced |
| **New mobile app** (Expo) | React Native app on the tarefe.de API | built, **not published** |
| **Old WordPress site** (`fa.tarefe.de`) | the previous marketing site | legacy |

**How data flows today**

| From → to | Status |
|---|---|
| Dynamics → new CRM | ✅ every record, every minute (mirror), attachments copied, nightly checks |
| New CRM → Dynamics | 🟡 close task / add note — built, switch on **dry** (test mode) |
| Website lead form → Dynamics | ✅ each lead is sent through `api.tarefe.de` into Dynamics |
| Website/app accounts ↔ Dynamics customers | ✅ linked (`User.crmContactId`): automatically when exactly one customer has the e-mail (else phone), or by staff — live 2026-11-11 |
| Dynamics → customer portal + new app | ✅ contracts and tickets of the linked customer (only «Send To Site» records, as the old app) — live 2026-11-11 (no customer accounts yet); documents (received letters + the customer's own old uploads) live 2026-11-11; points not yet |

## 3. Where everything lives

| What | Where |
|---|---|
| Website + CRM code | `C:\Claude\Tarefe` (git), GitHub **MarketingCyber/Tarefe**, branch `main` |
| Mobile app code | `C:\Claude\Tarefe-app` (git, **no remote** — laptop + local backup only) |
| Production server | **87.106.38.19** (Rocky Linux, host `tarefe-main`), our stack in `/opt/tarefe.de` |
| Other things on that server (not ours to change without OK) | OpenResty web server (`/opt/tarefesite/nginx`), old CRM bridge + CDN (`/opt/tarefesite`), WordPress (`/opt/wordpress`) |
| Old server 82.165.255.110 | dead since 2026-10-22, not used |
| Dynamics 365 server | `tarefe.online` (217.154.68.158), Windows domain PIDOLINK — run by the CRM developer, not by us |
| Local backups | `C:\Pourya\Tarefe\Local backups\` (see §10) |
| Owner's credential files (never in git, never in chat) | `C:\Pourya\Tarefe\…` (CRM login, CRM API, backup keys, Google OAuth client) |
| Design prototypes | app canvas https://claude.ai/artifact/BmB6h5Vbj7ShQLcHw6zfSJ, `docs/app-redesign/prototype/index.html` |
| Services taxonomy (source of truth) | `src/lib/taxonomy.ts` |

## 4. Website (tarefe.de) — built and live

**Stack**: Next.js 16 (App Router, Turbopack, `proxy.ts`), React 19, TypeScript, Tailwind v4, Prisma 7 + PostgreSQL
16, NextAuth v5, Motion + GSAP, Phosphor icons. Fonts: IRANSansX (Persian), Inter (Latin).

**Languages and layout**
- Three locales: `/fa` (main, right-to-left), `/de`, `/ru`; bare paths redirect to a locale.
- Right-to-left correctness: Latin runs (phone numbers, e-mails, IBANs, `§` references) are laid out left-to-right
  as isolated units — CSS rule on `.font-latin` in `globals.css`, `ltr()` helper (`src/lib/bidi.ts`) for text.

**Services and pages**
- Taxonomy-driven catch-all routing (`/[locale]/services/[...slug]`): Insurance (property, health, life/retirement),
  Energy, (Communication kept in the taxonomy) — category pages, sub-category pages, product lists (PLP), product
  pages (PDP), audience pages. 45 services reconciled from the old site.
- **Energy (electricity, gas)**: one guided page flow with a sticky section map; tariffs from the database
  (`EnergyTariff`, imported from provider Excel exports, admin in `/ops/energy-tariffs`); PLZ / consumption
  calculator; **live wholesale price chart** (electricity: Energy-Charts / SMARD day-ahead; gas: World Bank TTF +
  ECB rate) with price-guarantee message.
- **Dental**: before/after slider hero, dental cost map, real customer comments (fa/de/ru).
- **Google Ads landing journeys**: `/fa/landing/electricity`, `/fa/landing/gas` — calculator → tariff cards with
  price guarantee → form.
- **Qualification wizards** (one engine, config per service): PKV, dental, electricity, gas, car insurance, mobile
  contract, internet type.
- **Consultation / lead form** on every service page: German mobile numbers only (01…, 0049…, +49…), anti-abuse
  (`lead-guard.ts`: rate limit, bot and Tor checks), traffic-source attribution stored with each lead, then sent to
  Dynamics (via `api.tarefe.de`), GA4 (server-side) and Meta (Conversions API).
- **Content managed in /ops**: guides (`/guides`, CMS), FAQ (CMS), testimonials (real customer comments only).
- Global search (Persian + German terms resolve to the same service), compare tray (up to 3 products), SEO:
  sitemap, robots, JSON-LD (Organization, Breadcrumb, FAQ, Product), canonical/hreflang on the main templates.
- Legal pages in fa/de/ru: imprint, privacy policy (names GTM, sGTM, GA4, Ads, Meta Pixel + CAPI, Clarity), terms,
  cookie policy.
- Cookie notice (owner's design): neutral notice with "تنظیمات کوکی" + ×; settings dialog with necessary /
  analytics / ads switches that really work; tracking is on by default (owner's decision, §14).
- Security: CSP and security headers, per-IP rate limiting, staff MFA (TOTP).
- `/m` serves the new app's home-screen web build (when present).
- Automated end-to-end tests: Playwright suite in `e2e/` (auth, MFA, consultation, qualification, CRM pages,
  tasks, Customer 360, GDPR, CMS, uploads).

## 5. Tracking, analytics and marketing — built and live

- **Google Tag Manager** web container `GTM-M2LGN5WC` (live version 10) with tags: GA4, Google Ads, Meta Pixel
  (base / PageView / ViewContent / Lead), Microsoft Clarity; Consent Mode v2.
- **Server-side GTM** `GTM-TBWPZ97V` on `https://sgtm.tarefe.de` (own tagging server on our VPS).
- **GA4** + server-side lead event via Measurement Protocol (joins the visitor's session).
- **Meta Pixel 1440924411342428** + **Conversions API** for Lead, PageView, ViewContent, de-duplicated with a
  shared event id.
- **First-party analytics** (`/ops/analytics`, English): cookie-free visit counter (`landing_hits`, no IP / user
  agent stored, daily-rotating visitor hash), funnels for all visitors (calculator, tariff clicks, form starts and
  submissions), landing-journey funnel, events table groupable by arrival source; source attribution with
  visit / first / last touch (UTM > click ids gclid/msclkid/ttclid > referrer > direct).
- Lead funnel per source with conversion rate and closing reasons (in the new CRM, §7).

## 6. Customer portal (/app) — built and live

Signed-in customers: contracts, applications, documents (upload / download), support tickets with chat, profile,
GDPR data export (instant) and deletion request (reviewed by staff).

**Real data from the old CRM (live since 2026-11-11)** — `src/lib/crm/customer-link.ts`:
- Each account is linked to its Dynamics customer (`User.crmContactId`): automatically when exactly one customer
  has the account's e-mail (else exactly one has its phone) — ambiguous matches are left to staff, never guessed;
  staff can link by customer number or unlink on Customer 360; a staff-unlinked account is never re-matched.
- The linked customer's Dynamics contracts and tickets are projected into the site's `Contract` / `ServiceRequest`
  tables (tagged `crmId`), so the portal and the app (chat + requests per contract) show them unchanged. Read-only:
  Dynamics stays the master, refreshed when the portal / app loads and only if something changed in the mirror.
- Only records with Dynamics' «Send To Site» flag — what the old app showed customers (e.g. 33 of 34 contracts,
  31 of 72 tickets for a test customer; internal tickets like «خوش‌آمد گویی» stay hidden).
- Mapping: Dynamics contract type → website service (Persian name + icon), provider, contract number, dates,
  price converted to monthly from the payment interval, status (open/won → active, Angebot → pending, ended →
  cancelled). Active contracts' deadlines / end dates that have passed are hidden (Dynamics doesn't move them on
  automatic renewal — they showed as "overdue for 2 years").
- **Documents** (live 2026-11-11) — only what the old app showed (owner's decision 2026-11-11):
  - letters received for the customer (`new_receive_letter`, addressed to the customer or one of their contracts):
    the PDF is stored in the Dynamics record (`new_file_content`) and read from the mirror only when opened; the
    letter's short German summary (from its description JSON) is shown under the title;
  - files the customer uploaded on the old site / app: notes written on their tickets / contracts / contact by the
    integration accounts «tarefe site», «tarefe site2», «tarefe app» with a `cdn.tarefe.de/ticket|opportunity/…`
    link — one document per link, titled by the note («File uploaded: …» or its subject); test links to
    localhost are skipped;
  - never operators' notes, «System Administrator» notes (e-mail templates, generated letters), commission papers.
  - Copied into `Document` (tagged `crmId`, new `summary` column), linked to the contract when the letter / ticket
    belongs to a shown one; refreshed with contracts and tickets (a new note on one of the customer's tickets also
    triggers it); removed when gone from Dynamics. Staff can't delete them and the Customer 360 site list skips them.
  - Files are served only through the login-checked routes (`/api/documents/[id]`, `/api/v1/documents/[id]`):
    `Document.fileUrl` is `crm-letter:<id>` or `crm-cdn:<url>` (only exact `https://cdn.tarefe.de/ticket|opportunity/…`
    links are fetched, streamed through). When the CDN files move behind the login, only `readDocumentFile` in
    `src/lib/document-storage.ts` changes.
  - Test (local, sample customer): 3 letters with summaries + 53 own uploads; letter PDF downloads in the portal.
- **Referral codes** (live 2026-11-14) — `src/lib/referral.ts`:
  - Code: a linked customer's old-CRM code (contact `new_id`, e.g. `274259`, `000026`) — the code they already know;
    without one a random `TRF-XXXX-XXXX` (never from the name). A random code is replaced by the old one when the
    account gets linked. Share link keeps the old form `https://tarefe.de/referral/<code>`.
  - **Old share links work again**: `tarefe.de/referral/<code>` was a 404 on the new site (found 2026-11-14 — every
    link customers had shared was broken); now `src/app/[locale]/referral/[code]/route.ts` remembers the code (cookie
    `tarefe_ref`, 30 days, http-only) and opens the home page tagged `utm_source=referral`.
  - The code is stored with a lead from the site (`Lead.referralCode`) and on a new account (website sign-up, Google
    sign-up: from the cookie; app sign-in: optional «کد معرف داری؟» field → `User.referredByCode`). Leads sent to
    the old CRM carry a first description line «کد معرف: 000026 (name, customer number)» so operators credit the
    referrer; automatic crediting in Dynamics waits for step 4 (write-back). Staff see it on the lead page and on
    Customer 360 («معرفی‌شده با کد»).
  - **No points** (owner, 2026-11-14): the old CRM's points / star levels are left behind; customers see only the
    code, the link and the rule. Staff still see the old points on Customer 360 (old data, read-only).
  - Reward rule (owner, 2026-10-23): €10 voucher for the referrer when the referrer has an active contract AND the
    referred person signs a contract and doesn't cancel it within 14 days.
  - **Automatic rule check** (live 2026-11-14) — `src/lib/referral-check.ts`, staff page
    **/ops/referrals** («معرفی‌ها»): every account / lead that came with a code becomes a `Referral`; re-checked
    from the mirror (with the per-minute sync, at most every 15 min, and when the page opens). Statuses: waiting for
    the friend in the CRM (lead matched by exactly one contact's e-mail, else phone) → waiting for the friend's
    contract (stage Aktuell / AktuellT, made after the referral) → waiting out the 14 days → **voucher due** (when
    the referrer has an active contract) / referrer without active contract / friend cancelled within 14 days /
    invalid (unknown code, self-referral, friend already referred). Dynamics has no "signed on" date: the 14 days
    start when the check first sees the contract signed (first check: the contract's creation date); a cancellation
    after the 14 days doesn't count, a contract closed as replaced isn't a cancellation. Staff press «کارت هدیه
    فرستاده شد» (logged, can be undone); a sent voucher is never re-checked.
  - Test (local, 7 made-up referrals on real sample data): qualifies → due; inside 14 days → waiting with the end
    date; unknown friend; unknown code; self-referral; referrer without active contract; same friend twice → only
    the first counts. Second run kept the dates; «sent» button recorded and logged.
  - Portal dashboard «معرفی به دوستان»: rule, code, copy code / copy link. App: profile card (code, share, rule);
    `/api/v1/referral` returns `code`, `link`, `rule`, `shareText`.
  - Test (local): sample linked customer → code 274259 (= Dynamics); unlinked account → random code; old-style link →
    cookie + home; test lead stored with the code.
- Not yet: customer actions written back to Dynamics (§12 step 4), incl. crediting referrals automatically.

## 7. New CRM (/ops) — built and live

Staff back office in Persian (right-to-left). Roles: ADMIN, ADVISOR, LEAD_MANAGER, CONTENT_EDITOR, ANALYST;
pipeline pages need ADMIN / ADVISOR / LEAD_MANAGER. Staff accounts in `/ops/team`, MFA in `/ops/security`.

**Workspaces across both CRMs** (Dynamics mirror + website data together):
- **«کارهای من» My work** (`/ops/my-work`): each operator's day — overdue / today's Dynamics tasks, calls,
  appointments, cancellation deadlines of their contracts, ticket follow-ups, open leads; plus site tasks / leads /
  tickets. Staff pick "who I am in the old CRM" once (`User.crmUserId`).
- **Customers** (`/ops/customers`): search across all 6,854 Dynamics customers + site accounts (name, e-mail, phone
  in any format, customer number); the account ↔ CRM-customer link with how it was made, unlink / link by customer
  number (live 2026-11-11); **Customer 360** — header facts (customer number, referral code, points, IBAN
  masked, services), contracts, tickets, merged history (e-mails, calls, tasks, appointments, notes incl. those on
  their contracts/tickets), points, other records, site applications / documents / conversations.
- **Contracts** (`/ops/contracts`): cancellation-deadline list (Kündigungsfrist, last 30 / next 90 days, bucketed),
  all contracts with search and filters, site contracts; **Contract 360** page.
- **Tasks** (`/ops/tasks`): open Dynamics tasks / calls / appointments by due date per operator; site tasks tab.
- **Tickets** (`/ops/tickets`): needs-attention list (open tickets + overdue follow-ups), all tickets, ticket page
  (request, operator note, follow-up date, history); site / app tickets with SLA tab.
- **Leads** (`/ops/leads`): funnel per period, conversion per source, closing reasons, open and all leads, lead
  page linking to the contract it became and to matching website form submissions; website forms tab.
- **CRM قدیم Old CRM** (`/ops/old-crm`): every mirrored Dynamics table, record pages laid out like the Dynamics
  forms (same tabs, sections, labels), sync status, nightly reconciliation result, attachment copy progress.
- **Automations in test mode** (`/ops/old-crm/automations`): §8.
- **Write-back** (test mode): «انجام شد» close a task / call / appointment, «ثبت یادداشت» add a note — §8.
- Other: applications, app conversations and app banners (hidden unless `APP_ENABLED`), energy tariffs admin,
  guides / FAQ / testimonials CMS, analytics, team, security.

## 8. Old CRM (Dynamics 365) integration

**Access**: Web API `http://tarefe.online/Tarefe/api/data/v9.1/`, Windows sign-in (NTLM). The server uses the
**owner's own login (PIDOLINK\p.hamid)** until the CRM developer creates a service user. That login reads almost
everything, can create/edit contacts, contracts, tickets, leads, notes, activities; it **cannot read** finance
records (`new_finance_record`), `new_contact_opp_count_saver`, webhooks (service endpoints), solutions.

**Mirror** (`src/lib/dynamics/`):
- Every readable table copied into `crm_records` (389k records: contacts, accounts, opportunities = contracts,
  incidents = tickets, leads, notes, tasks, e-mails, calls, appointments, points and ~30 custom tables), field
  labels (`crm_fields`), form layouts (`crm_forms`).
- Compose service `crm-sync` triggers a round every minute (change tracking where Dynamics allows it, otherwise by
  `modifiedon`); nightly deletion check + reconciliation report (`crm_checks`: counts + field-by-field sample) and
  label / form refresh.
- **Secrets are never copied** (Dynamics stores API keys, tokens and old site passwords in plain text).
- Indexed links between records (`refs`) and filter columns (`dueAt`, `state`, `ownerId`).
- **Attachments**: files of Dynamics notes copied into the private upload folder (1,700 files), served to staff
  only via `/api/crm-files/[id]`.

**Write-back** (`src/lib/dynamics/write.ts`, phase 2): Dynamics first, then read back into the mirror; each action
logged under the staff member; note titles carry «tarefe.de · name». Switch `CRM_WRITES`: off / **dry** (current on
the server) / on. Tested for real on 2026-11-04 with one TEST task (create, edit, complete) — works; Dynamics renames
task subjects with a "Sonstig-" prefix.

**Automations in test mode** (`src/lib/automations/`): our code plans what Dynamics would do (05:00–06:00 Berlin)
and compares with what Dynamics did (after 07:00); nothing is written. Running:
- **Kündigungsfrist** (task on a contract's cancellation deadline): live comparisons since 2026-11-04 —
  46 of 54 predicted tasks matched exactly, 0 created only by Dynamics; misses look like "Won" contracts.
- **Vertragsende** (task on a contract's end date): live since 2026-11-04 — many predicted tasks not created by
  Dynamics, so the rule for which contracts get one still has to be found.

**Facts about Dynamics** (for the migration): 581 tables (~40 own), 388 active processes (195 workflows, 143
actions, 41 business rules, 9 process flows), custom plugins (TarefeSiteSyncer, TarefeBusiness2, DateCalcPlugin,
BayatSoft notifications, WhatsApp, …). Maps in `docs/crm-redesign/`.

## 9. Mobile app — built, not published

- Expo SDK 58 / React Native 0.88, expo-router, React Query; Persian right-to-left; brand purple `#5d0089`.
- Screens: Home (greeting, campaign slider, deadline card, unread, contracts, referral), Contracts (+ contract page),
  Offers, Documents (+ upload), Support (per-contract conversations, new request), Profile (incl. delete account),
  sign-in with e-mail + 6-digit code.
- Back end in the website repo: `/api/v1/*` (sign-in codes, JWT + refresh tokens, contracts, conversations,
  documents, devices, banners, referral, me) — **switched off in production** (`APP_ENABLED` not set → 404).
- E-mail for sign-in codes: Zoho SMTP prepared, **no Zoho account yet**; closed-test list `APP_BETA_EMAILS`.
- Push: Firebase project `tarefe-app-cf696` (FCM v1, Installations, Registration APIs enabled — checked
  2026-11-03); the old app's Firebase apps are `com.app.tarefe` (Android + iOS), the new app is set to
  `de.tarefe.app` — **decision pending** (§13).
- Home-screen web build served at `tarefe.de/m` (laptop-built, not deployed).
- Shows the customer's **real contracts and tickets from Dynamics** once the account is linked (§6; live on the server
  2026-11-11, app itself still off) — checked locally through the real app API: 22 active contracts with Persian service
  names, monthly prices and upcoming deadlines, one conversation per contract created automatically.
- Docs: `docs/app-redesign/` (goals, architecture, old app inventory, environments, roadmap, data mapping,
  notifications, customer test).

## 10. Infrastructure, deploys and backups

**Server stack** (`/opt/tarefe.de`, docker compose project `tarefe-next`):
- `web` (Next.js, 127.0.0.1:3100, routed by OpenResty `tarefe-next.conf`), `db` (PostgreSQL 16, `./pgdata`),
  `backup` (nightly `pg_dump`, 14 days in `./backups`), `offsite` (restic → STRATO HiDrive S3 `tarefebackup`,
  nightly 03:30 UTC, 14 daily / 8 weekly / 12 monthly, check on Sundays), `crm-sync` (Dynamics mirror every minute).
- Separate: `tarefe-sgtm` (server-side GTM, `/opt/tarefe.de/sgtm`).
- Secrets in `/opt/tarefe.de/.env` (root-only): `POSTGRES_PASSWORD, AUTH_SECRET, META_CAPI_TOKEN,
  DYNAMICS_CLIENT_ID/SECRET (lead API), GA4_MEASUREMENT_ID, GA4_MP_API_SECRET, DYNAMICS_CRM_USER/PASSWORD,
  CRM_SYNC_SECRET, CRM_WRITES`; off-site keys in `offsite.env`.
- Uploaded files: `/opt/tarefe.de/uploads` (site documents + `crm-files/`).

**Deploy procedure** (from the laptop):
1. `git archive HEAD src package.json package-lock.json next.config.ts prisma/schema.prisma` → upload to `/tmp`.
2. Check the archive exists on the server **before** deleting anything; back up `app/src` to
   `app-src-backup-YYYYMMDD.tgz`.
3. Replace `app/src`, `docker compose build web && docker compose up -d web`.
4. If the schema changed: `docker compose exec -T web npx prisma db push` (additive changes only) — **after** step 3
   (`up -d`): run in the old container it sees the old schema and does nothing.
   Never while `scripts/local-backup.sh --full` is dumping the database — the change waits for the dump and blocks
   that table meanwhile.
5. Check `https://tarefe.de/fa` = 200 and `https://tarefe.de/api/v1/me` = **404** (app must stay off).
6. `git push`.
- **SSH note**: when direct connections from the laptop are blocked, SSH works through the local proxy:
  `-o "ProxyCommand=connect -S 127.0.0.1:10808 %h %p"`.

**Backups**
- Server: nightly database dump (14 days) + encrypted off-site copy (restic, STRATO).
- Old system's restic backup (WordPress, old CRM, MySQL) — fixed 2026-10-29.
- **Local**: `C:\Pourya\Tarefe\Local backups\` — full snapshot 2026-11-09 (code bundles, database dump test-restored,
  uploads byte-identical, server config, secrets, notes); refreshed with `scripts/local-backup.sh` (§18).

## 11. In progress right now

| Item | State | Next step |
|---|---|---|
| Write-back (close task, add note) | live in **dry** mode | team tries it → owner says go → switch to **on** |
| Automations test mode | Kündigungsfrist + Vertragsende comparing daily | find Vertragsende's real rule; confirm "Won" contracts are skipped |
| Mobile app | built, not published | customer identity + real data (§12 steps 2–4), accounts (§13) |
| Old CDN files (34 GB, public by link) | decision pending | copy behind staff login, later close the public CDN |
| Customer link + real data in portal / app (plan steps 2–3) | **live** 2026-11-11, documents too; referral codes + voucher-rule check live 2026-11-14 | step 4 (customer actions into Dynamics) |

## 12. Plan for the future

In the order agreed / recommended (2026-11-07):

1. **Write-back fully on**, then more operator actions: create a task (with Dynamics' "Sonstig-" naming), ticket
   status and follow-up date, contract key fields, new lead / customer. Swap the owner's login for the CRM
   **service user** when it exists.
2. ~~One customer identity across platforms~~ — **live 2026-11-11**: link by e-mail / phone, staff
   link / unlink.
3. **Customer portal + app show the real data** — contracts, deadlines and tickets **live 2026-11-11**; documents
   (customer uploads + letters sent to the customer, as the old app) **live 2026-11-11**; still open:
   referral codes **live 2026-11-14** (no points — owner 2026-11-14); voucher-rule check + staff page live 2026-11-14. Required before the app can launch.
4. **Customer actions go into Dynamics**: a new request becomes a Dynamics ticket, an upload becomes a note with
   the file on the contract, profile changes update the customer.
5. **Notifications from CRM events** (ticket status, deadlines, new documents) by push, e-mail and in-app — needs
   Expo + Zoho accounts.
6. **Automations take over**: finish the test-mode comparisons (next: birthday reminders, welcome tickets
   «خوش‌آمد گویی», lead follow-ups, points, date calculations), then switch each one over.
7. **Switch the system of record (phase 4)**: the new CRM becomes the master; Dynamics gets a copy, then read-only.
8. **Retire the old platform**: website leads go straight into the new CRM (not via `api.tarefe.de`); old app users
   move to the new app (e-mail code sign-in, no passwords needed); CDN files move behind the login; the old server
   is shut down; Dynamics archived (phase 5).

**Website, still open** (from the original Phase 2/3 specs): full content for every service page (only some have
real tariff data), canonical / hreflang on all page types, mobile-specific patterns (filter drawer, bottom
sheets) everywhere, Communication services decision.

**App launch checklist**: app ID decision, Expo account + EAS builds, Firebase config files, Zoho sign-in e-mail,
Apple / Google store access, steps 2–5 above, closed test with customers (`docs/app-redesign/07-customer-test.md`),
then switch `APP_ENABLED` on in production (owner's OK) and publish.

## 13. Waiting on other people

| Who | What | Blocks |
|---|---|---|
| CRM developer (BayatSoft) | **service user** for tarefe.de (read all, create/write CRM tables, no delete, not admin) | long-term write-back, phase 4 |
| CRM developer | **HTTPS** for the Dynamics Web API (today plain HTTP) | security |
| CRM developer | C# source or description of custom logic (points, customer level, commission, letters, date calculations) | automations (§12 step 6) |
| CRM developer | read access: finance records, webhooks, solutions | complete mirror, integrations map |
| Owner | go-ahead to switch write-back **on** | §12 step 1 |
| Owner | decision on the 34 GB CDN files | §12 step 8 |
| Owner | Expo account, Zoho mail account, app ID (`com.app.tarefe` vs `de.tarefe.app`), Apple + Google store access, Firebase config files | app launch, notifications |

## 14. Owner's rules and decisions

- **Keep everything from the old CRM** — every field, label, stage, status and automation; operators must recognise
  every screen. Only exception: stored site passwords are not copied.
- **Parallel run**: both CRMs synced; one system of record at a time (Dynamics until the switch); after QA / QC the
  full migration. Exit criteria: 2 weeks with zero unexplained differences, every automation matched, operators sign off.
- **Never write to Dynamics** except through the approved write-back (switch `CRM_WRITES`); never delete there.
- **App stays off in production** until the owner publishes it (`APP_ENABLED` never set without the owner's OK).
- The app **never shows the website's energy tariffs**; app offers are the advisor's personal offers.
- Leads from 2026-10-22..25 were never sent to the CRM — **do not re-send** old leads.
- Tracking on by default (owner's decision 2026-10-29); **do not change the cookie banner**; policy texts stay
  accurate.
- **No fabricated** testimonials, reviews, ratings, prices or statistics.
- Secrets: never in chat, never in git; installed via files / hidden prompts; never printed.
- Server: only change `/opt/tarefe.de` unless the owner approves something else (approved before: OpenResty routing,
  sgtm, the old backup script fix).
- Sign-in for customers by e-mail code (no SMS); referral codes random, never from names.
- Referral codes (2026-11-11): existing customers keep their numeric code from the old system (e.g. `000026`), so
  links and codes they already shared keep working; new customers get random codes under the new rule.
- Referral reward (2026-10-23): €10 voucher for the referrer when the referrer has an active contract and the referred
  person signs a contract and doesn't cancel it within 14 days. **No points** in the new system (2026-11-14): the old
  points / star levels are left behind.
- In chat, the customer's messages on the right, the advisor's on the left.
- Design work uses the agreed design skills (taste, frontend-design, Emil Kowalski, GSAP, UI/UX Pro Max); brand
  purple `#5d0089`.

## 15. Known issues and risks

- **Dynamics runs on plain HTTP**; the owner's password travels inside NTLM sign-ins. Fix: HTTPS (CRM developer).
- **The owner's personal login is on the server** for the sync; a password change stops the mirror. Fix: service user.
- **Dynamics stores secrets in plain text** (API keys, tokens, old site passwords) — not copied by us; the keys that
  were briefly copied on 2026-10-30 should be **rotated** (ChatGPT, Gemini, WhatsApp token, site API password).
- **Old referral links were broken** (404) from the new site's launch until 2026-11-14; referrals made through them in
  that time arrived without a code.
- **`cdn.tarefe.de`**: 34 GB of customer documents readable by anyone with a link (random names, no login).
- **The app repo has no remote** — only the laptop and the local backup hold it.
- Laptop: direct connections are sometimes blocked (use the proxy for SSH); Docker Desktop stops after restarts
  (local database needs it).
- Old leads 2026-10-22..25 not in Dynamics (by decision).
- **Fixed 2026-11-10 (live 2026-11-11): one person could get two accounts** — website sign-up stored the e-mail as
  typed, app sign-in looked it up lowercase and created a second account. E-mails are now stored lowercase and looked
  up ignoring case everywhere (`src/lib/email-address.ts`); production had no duplicates (3 staff accounts).
- The hourly notification rules (`scripts/run-notification-rules.ts`, in-app notifications only) are not scheduled on
  the new server.
- The cookie-free visit counter's legal basis (legitimate interest) was not reviewed by a lawyer.

## 16. How to work on the project

**Local development (website + CRM)**
- Database: Docker container `tarefe-local-db-1` (PostgreSQL 16, port 5434) — start Docker Desktop first.
- `npm run dev` in `C:\Claude\Tarefe` (or the "tarefe-dev" preview server); `npx prisma db push` after schema changes,
  restart the dev server after `prisma generate`.
- Laptop `.env`: `DATABASE_URL, AUTH_SECRET, APP_ENABLED (true locally), DYNAMICS_CRM_CREDENTIALS_FILE,
  CRM_SYNC_SECRET, CRM_WRITES (dry locally)`.
- Local test staff account from the seed: `advisor@tarefe.de` (seed with `SEED_TEST_USERS=1`).
- Never run a second full Dynamics import from the laptop while the server syncs (loads the CRM operators use).

**Local development (app)**: `C:\Claude\Tarefe-app`, `npx expo start`; `.env` points the API at the laptop
(`EXPO_PUBLIC_API_URL`).

**Checks before a deploy**: `npx tsc --noEmit`, `npx eslint <changed paths>`, verify in the browser.

## 17. Detailed documents

| Topic | File |
|---|---|
| Old CRM map, automations, data model, parallel-run plan | `docs/crm-redesign/01–04` |
| App redesign (goals, architecture, inventory, environments, roadmap, data mapping, notifications, customer test) | `docs/app-redesign/` |
| Design system | `docs/design-system.md` |
| Server routing | `deploy/ROUTING.md` |
| E2E tests | `e2e/README.md` |
| Scripts | `scripts/README.md` |
| Local backup contents and restore | `C:\Pourya\Tarefe\Local backups\<date>\README.md` |

---

## Keeping this file current

**After every change to the project** (code, server, settings, data, decisions):
1. Update the sections above that changed (status, plan, waiting-on, rules, risks) and the "Last updated" date.
2. Add a line to the [changelog](#changelog) (date, what changed, deployed or not).
3. Commit this file together with the change.
4. Refresh the local copy: `bash scripts/local-backup.sh` (code, this file, notes — quick);
   after a deploy or data change: `bash scripts/local-backup.sh --full` (adds the live database, uploads and server
   config into a new dated folder).

## Changelog

| Date | Change | Deployed |
|---|---|---|
| 2026-08-28..30 | Phase 1–2 website (taxonomy, routing, design system, wizards, search, compare), back end (Postgres, auth, CRM, portal, MFA, analytics), E2E tests — on the old server | yes (old server) |
| 2026-10-03 | Git repository started (MarketingCyber/Tarefe) | — |
| 2026-10-08..17 | Lead sync to Dynamics, energy pages redesign + gas, phone rules, anti-abuse, analytics v2 + attribution + cookie-free counter, wholesale price chart, Google Ads landing journeys, dental page | yes |
| 2026-10-22 | New server 87.106.38.19 with Docker stack; data restored | yes |
| 2026-10-23..24 | GTM + sGTM, Clarity, Meta Pixel + CAPI, app redesign plan, app back end (behind `APP_ENABLED`), Expo app | website yes, app no |
| 2026-10-29 | Tracking on by default, cookie settings dialog, Zoho e-mail prep, off-site backup of our stack | yes |
| 2026-10-30 | Meta PageView / ViewContent; Dynamics mirror (phase 1), old-CRM view, reconciliation, secrets stripping; Customer 360, contracts, tasks, tickets, leads workspaces | yes |
| 2026-11-03 | My work page, Dynamics attachments copy, automations test mode (Kündigungsfrist, Vertragsende) | yes |
| 2026-11-04 | Right-to-left number fix (phone numbers, § references); one real write-back test in Dynamics (TEST task) | yes |
| 2026-11-05 | Write-back: close task / add note, switch `CRM_WRITES=dry` on the server | yes (dry) |
| 2026-11-09 | Full local backup (`C:\Pourya\Tarefe\Local backups\2026-11-09`); this status file + `scripts/local-backup.sh` | file only |
| 2026-11-10 | Plan steps 2–3: account ↔ Dynamics-customer link (auto by e-mail/phone, staff link/unlink on Customer 360); the linked customer's Dynamics contracts and tickets («Send To Site» only) in the portal and app API; passed deadlines of active contracts hidden; staff site tabs skip the projected copies; fix: one account per e-mail (case-insensitive) | yes, 2026-11-11 |
| 2026-11-11 | Deployed plan steps 2–3 (database: new optional columns only, 0 errors); owner's decision: customers see only their own uploads and letters sent to them | yes |
| 2026-11-11 | Customer documents from the old CRM: received letters (PDF from the Dynamics record, with summary) and the customer's own old uploads (CDN links in the integration accounts' notes) in the portal and app, served only through the login-checked routes; staff can't delete them; database: `documents.crmId`, `documents.summary` (optional); app shows letter summaries | yes, 2026-11-11 |
| 2026-11-11 | Deploy note: the schema change waited ~13 min behind the running full backup's database dump (documents pages failed meanwhile); backup stopped on the owner's OK, change applied, site checked (no errors), backup restarted. Rule: never deploy a schema change while `local-backup.sh --full` is running | yes |
| 2026-11-11 | Owner's decision: existing customers keep their numeric referral codes, new customers get random codes | — |
| 2026-11-11 | `local-backup.sh --full` reworked for the slow laptop link: uses the server's nightly DB dump (no live dump from the laptop), resumable downloads checked by SHA-256, uploads via a local mirror (`Local backups/uploads-mirror`, only new files fetched), server setup packed on the server first | — (laptop script) |
| 2026-11-14 | Referral codes (+ points, removed before deploy): old-CRM code for linked customers (random TRF code otherwise), old share links `tarefe.de/referral/<code>` work again (were 404), code captured on leads / sign-ups / app sign-in and written into the lead sent to Dynamics, Dynamics points (total + history: earned / redeemed / pending) on the portal dashboard and in the app; database: `users.referredByCode`, `leads.referralCode` (optional) | no |
| 2026-11-14 | Owner: no points in the new referral system, only the €10 voucher rule — points removed from the portal, the app and the app API before deploy | yes, 2026-11-14 |
| 2026-11-14 | Deployed referral codes (database: `users.referredByCode`, `leads.referralCode`); first deploy's link redirect pointed at the internal address `0.0.0.0:3000` — fixed with a relative redirect and redeployed; old links `tarefe.de/referral/<code>` checked live (home page, code remembered) | yes |
| 2026-11-14 | Referral voucher rules checked automatically (lib/referral-check.ts, with the CRM sync every 15 min) + staff page /ops/referrals («معرفی‌ها»: status per referral, «voucher sent» button, logged); database: new table `referrals` | yes, 2026-11-14 (sync rounds OK, no referrals yet) |
