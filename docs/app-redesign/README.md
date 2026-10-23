# Tarefe app redesign — overview

Goal: a new Tarefe mobile app (Android + iOS) on top of ONE central Tarefe CRM that the website, the app and the staff back office all share. Dynamics 365 sync is optional and comes last.

## The six goals (everything is judged against these)

Customer needs
1. All contracts in one place
2. Contact with support
3. Documents at hand (download + upload)

Company needs
4. Easy contact and notifications to the customer (push on Android AND iOS, via Firebase)
5. Introduce our products and stay in the customer's mind
6. Encourage referrals (marketing helper)

Rule: a feature of the old app stays only if it serves one of these six. Everything else is cut or parked (see 02-old-app-inventory.md). Cut so far: letters (Briefe) and meter readings.

## Two messages on every screen where it fits
- All Tarefe services are free of charge: the customer is never charged for anything.
- We find the lowest price for each service, based on each person's own situation.

## Referral (owner's rules)
10 € voucher for the referrer when: the referrer has an active Tarefe contract, AND the referred person signs a contract and does not cancel it within 14 days.

## Decisions taken (2026-10-23)

| Decision | Choice | Why |
|---|---|---|
| App technology | React Native with Expo (one TypeScript codebase) | Real push on both platforms, store presence, same language as the site and CRM. Not Capacitor (owner's choice), not a PWA (iPhone push needs a manual install). |
| Central system | The existing Tarefe site back end (Next.js + Postgres + Prisma) becomes the CRM and the API | It already has leads, tickets, tasks, customer 360, contracts, applications, documents, notifications, 2-step login. One source of truth. |
| Old CRM (Node + MySQL on the VPS) | Replaced step by step, after a data-migration plan | Avoid two CRMs. |
| Dynamics 365 | Optional adapter, last | A lead sync already exists (src/lib/dynamics-lead-sync.ts). |
| Work flow | Laptop (local dev) -> QA -> staging on the VPS -> production | See 03-environments.md. |
| Accounts | Apple Developer, Google Play Console, Firebase: owner says they exist | Needed for store builds and push. |
| Sign in | Email + 6-digit one-time code sent through the email API; no SMS, no phone verification. Face ID / fingerprint unlocks the app after the first sign-in | Owner's choice: Tarefe does not use mobile/SMS for login or verification. |
| Services in the app | The website taxonomy (src/lib/taxonomy.ts): top level = category (Energy, Insurance, Retirement) for tabs and filters, subcategory (e.g. Electricity, Gas) for chips, product type (e.g. Dental insurance) for offer cards. Only published categories appear | Internet and mobile are no longer offered (communication category is unpublished). |
| Referral codes | Random, non-guessable codes (e.g. TRF-7QK4-M9XD), never built from the person's name | Owner's choice; also avoids leaking names and guessable codes. |
| Support per contract | Every contract has its OWN conversation and its OWN requests (tickets) with status (registered, in progress, done). The Support tab first asks which contract (logo, service, provider, tariff, monthly price, last message, open requests, unread count); a "general question or new service" conversation covers the rest. Request topics depend on the contract type. | Owner's request (2026-10-23); matches how staff already work per contract. Parts taken from the owner's dashboard mock-up: per-contract chat with unread counts, total monthly payment, "end of period is not automatic cancellation" note, upload limits (PDF/JPG/PNG/WEBP, 10 MB). |
| App Home | Owner chose summary + slider (2026-10-23): a purple summary hero (greeting, number of contracts, total per month, the ONE thing to act on now, the free promise) and under it a campaign slider staff manage in /ops/app-banners (image or GIF, title, text, button; swiped by hand, no autoplay, max 5 per language). | Personal first, marketing second, both on the first screen. |
| Offers in the app | **Never the website's energy tariffs** (owner, 2026-10-23: those are marketing tariffs for the website only, with low margin). An offer in the app is the advisor's personal offer for that customer (an "Angebot" in the CRM), sent into the contract conversation; the Offers tab asks for free advice. No app API route reads the tariff tables. | Margin: website tariffs attract new leads; customers get the advisor's offers. |
| WhatsApp | **Not in the first release (owner, 2026-10-23): no integration for now.** The chat screen only has a button that opens the assigned advisor's own WhatsApp. If needed later: one conversation per customer in the central CRM with two doors: the in-app chat and WhatsApp (WhatsApp Business Platform / Cloud API). Staff answer once in /ops; the reply reaches the customer where they prefer. Photos and PDFs sent on WhatsApp are filed into the customer's documents | Customers already talk to Tarefe on WhatsApp; the app must not take that away. |

## Documents

- 01-architecture.md — how the pieces fit
- 02-old-app-inventory.md — what the old app does today, and what stays
- 03-environments.md — local, staging, production, and how code moves between them
- 04-roadmap.md — phases and what comes first
- prototype/index.html — clickable prototype of the 8 app screens (one file, sample data). Open it in any browser, or send it to people who have no Claude account.
