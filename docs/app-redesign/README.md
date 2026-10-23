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

## Documents

- 01-architecture.md — how the pieces fit
- 02-old-app-inventory.md — what the old app does today, and what stays
- 03-environments.md — local, staging, production, and how code moves between them
- 04-roadmap.md — phases and what comes first
