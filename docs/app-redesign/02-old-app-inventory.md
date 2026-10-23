# The old app — what exists today

Sources: the public store listings (read 2026-10-23) and the old back end code on the VPS (/opt/tarefesite/node-app, read-only look at routes and model names; no customer data was read).

## Store facts
- **iOS** "Tarefe App" (id 6748063999): version 1.8.6 (Aug), 16.4 MB, iOS 15+, rating 3.7 from 3 reviews (one positive in Persian, one calling it a scam), store language English only. Privacy label lists identifiers, usage data and diagnostics used for TRACKING, plus financial and contact information collected.
- **Android** "Tarefe": 1K+ downloads, tagline «تعرفه، تو همه قرارداد ها باهاته».
- Store description: compare insurances and services, personal advice before signing, manage all contracts, support after signing, avoid hidden costs and long terms.

## Old back end (tarefe-api, Node.js + MySQL, Firebase push)
App API `/api/v1`:
- users — 24 endpoints (account, profile, login/activation codes …)
- contract — 9
- ticket — 6
- letter (Briefe) — 4
- meter (meter readings) — 5
- lead — 1

CRM API `/crm/v1` (used by the CRM, not by customers): contact, opportunity, lead, account, service, portal, ticket, operator, email, notification, file, letter, signature (e-signature), ai.

Other: CMS-driven screens (tables for pages/modules/translations, blogs), activation codes, Firebase Admin (push), background worker.

## Keep / cut / decide (first proposal — to be confirmed with usage numbers)

| Old feature | Serves goal | Proposal |
|---|---|---|
| Contracts list + detail | 1 | KEEP, redesign as the home screen |
| Tickets / support | 2 | KEEP, add chat-style thread + WhatsApp shortcut |
| Documents (files) | 3 | KEEP, add camera scan + upload, per-contract folders |
| Push notifications | 4 | KEEP, rebuild with rules and preferences |
| Profile edits | — | KEEP minimal (name, phone, language, password, delete account) |
| Letters (Briefe) | 1/3 (maybe) | DECIDE: probably becomes "documents of type letter" |
| Meter readings | — | DECIDE with usage numbers; keep only if energy customers really use it |
| Lead form in app | 5 | MERGE into "request a consultation" on product cards |
| Comparison of products | 5 | CUT in the app (the website does it); app shows product cards + consultation request |
| Blogs / CMS pages | 5 | DECIDE: a small "tips" feed at most |
| E-signature, AI | — | CRM/back office side, not in the customer app for now |
| Referral | 6 | NEW |
| Offers / product cards | 5 | NEW |

## Numbers still needed before cutting anything
Usage per feature (active users, opens, tickets, uploads, meter entries). Sources: Firebase Analytics if enabled; read-only COUNT queries on the old CRM database (needs the owner's OK).
