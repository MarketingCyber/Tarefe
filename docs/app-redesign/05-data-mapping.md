# Old CRM data -> new central database (mapping draft)

Source: the old app database `tarefe` (MySQL, container `mysql-db` on the VPS), read for STRUCTURE and COUNTS only on 2026-10-23. Target: the Postgres schema in prisma/schema.prisma.

## Most important finding: today's master is Dynamics 365
Almost every old table carries `crm_*` ids (crm_contact_id, crm_opportunity_id, crm_ticket_id …), `crm_sync_log` has 577 entries in the last 30 days, and the CRM calls the old API about 8,900 times a day (create/update contact, point, gift, ticket …). So the MySQL database is a **mirror of Dynamics 365**, and staff do their work in Dynamics (they create 90 % of tickets).

Consequence for "one central CRM": either
- **A. The new CRM replaces Dynamics** — staff move to /ops, data is imported once, Dynamics is switched off at the end; or
- **B. Dynamics stays the staff tool for now** — the new back end becomes the hub for app + website and syncs both ways with Dynamics, until A is possible.

The owner leans to A ("Dynamics optional, maybe leave it"). B is the safer path while staff still work in Dynamics. **Decision needed before the migration is built.**

## Entity mapping

| Old (MySQL) | Rows | New (Postgres) | Notes |
|---|---|---|---|
| users | 5,210 | User (role CUSTOMER) | email on every row but **112 duplicate emails and 148 duplicate mobiles** -> merge rules needed. New User needs `mobile` (+ unique), language, referral code, old ids (`legacyId`, `crmContactId`). |
| users__detail | 4,205 | NEW CustomerProfile | address, birthdate, nationality, marital status, spouse, job, income, household … plus **IBAN/BIC on 3,606 rows -> must be stored encrypted**. Keep only fields a service needs. |
| users__children | 325 | NEW FamilyMember | for family insurances |
| users__business | 122 | NEW BusinessProfile | includes IBAN -> encrypted |
| companies | 13,217 | NEW Provider | insurers / energy / telecom companies with logo; many are probably duplicates |
| contracts | 25,384 | Contract | add: type (Aktuell / Aktuell T / **Angebot = offer**), service, provider, numbers (Auftrags-, Vertrags-, Kundennummer), duration, price + period, cancellation date, the many product-specific fields (vehicle, energy usage, dental, legal, pet, mobile, rent …) as JSON per service |
| contracts__service (+ type, portal, duration, price_period) | 70 / small | NEW ServiceCatalog (or the existing taxonomy) | map each old service to a taxonomy slug |
| tickets | 22,559 | ServiceRequest | status map: waiting for an answer / answered / closed / deleted |
| tickets__log | 25,096 | Message | created_by Operator / User -> sender |
| files | 38,732 | Document | entity opportunity / ticket / email / contact / account -> contract / request / customer; the FILES themselves must be copied too (file_url) |
| leads | 8,719 | Lead | origin -> source; referrer_user_id kept |
| users__fcm_device_tokens | 850 | NEW Device | tokens can be reused only if the new app uses the same Firebase project; otherwise devices re-register on first start of the new app |
| devices, api__tokens, activation_codes | 100k+ | not migrated | sessions and one-time codes |
| users__points, points, users__gifts, gifts | 23,380 / 375 | NEW Referral / Reward (pending the owner's rules) | |
| letters, users__letters, meters, meters__log | small | **not migrated** (features cut) | export once as an archive |
| blogs, api__pages/modules/translations | small | not migrated | content lives on the website |
| operators | 23 | User (staff roles) | staff accounts, new passwords + 2-step login |

## Security findings in the old system (to tell the owner, fix independently of the redesign)
- Only 2,808 of 5,210 customer passwords look like bcrypt hashes; 2,402 use another format.
- 4,201 customer rows and all 23 staff rows store a `crm_password` (a password for the CRM side). How it is stored was not inspected; if it is readable, these are live credentials in a database that is reachable by phpMyAdmin.
- The CRM API logs full bearer tokens (seen earlier in the API container log).
- New system: no password is migrated as-is; customers set a new password or log in with a one-time code, staff get new accounts with 2-step login.

## Migration approach (later phase)
1. Read-only export from MySQL (or from Dynamics, depending on A/B) into a staging database on the laptop, **anonymised** for development.
2. Transform scripts with checks (counts per entity, duplicates resolved, every file copied).
3. Dry run on staging, compare counts, fix, repeat.
4. Final run in a planned window; the old app keeps working until the new one is in the stores.
