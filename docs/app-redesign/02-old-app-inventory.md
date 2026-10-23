# The old app — what exists today and what stays

Sources: the public store listings (2026-10-23), the old back end code on the VPS (/opt/tarefesite/node-app, routes and model names) and **aggregate counts** from its database (`tarefe` in the `mysql-db` container; counts only, no personal data read). The mobile app's own source code is NOT on the VPS (searched for Expo/React Native/Flutter/Android/Xcode projects and app packages; only the API, the PHP panel and WordPress are there).

## Store facts
- **iOS** "Tarefe App" (id 6748063999): v1.8.6 (Aug), iOS 15+, rating 3.7 from 3 reviews, store language English only. Privacy label declares identifiers/usage/diagnostics used for tracking.
- **Android** "Tarefe": 1K+ downloads, tagline «تعرفه، تو همه قرارداد ها باهاته».

## Usage numbers (old CRM database, 2026-10-23)

| Area | Numbers |
|---|---|
| App users | 5,210 total · logged in last 30 days: 323 · last 90 days: 671 · last 365 days: 1,983 · 40–190 new per month |
| Push devices | iOS 479 (304 active in 90 days) · Android 371 (216 active) — **iOS is the larger group** |
| Contracts | 25,384 total, 11,290 created in the last 12 months · types: "Aktuell T" 13,553, **"Angebot" (offer) 10,304 (6,685 in 12 months)**, "Aktuell" 1,527 |
| Tickets | 22,559 · created by staff 20,821, by customers 1,974 · status: waiting for an answer 11,465, closed 7,562, answered 3,234 |
| Files | 38,732 · mostly attached to opportunities (31,294) and tickets (6,432) · 1,000–2,500 per month |
| Letters (Briefe) | **4 generated in the last 12 months** |
| Meter readings | **73 readings ever, 7 in the last 12 months (7 users)** |
| Leads by source | website 4,745 (1,630 in 12 months) · ads 705 (444) · customer referral 554 (146) · other 602 · inbound calls 416 · Instagram 377 · Telegram 227 · WhatsApp 215 |
| Loyalty points | per contract 13,007 · registration 5,142 · one-year loyalty 3,090 · friend referral 800 · renewal 698 · being referred 496 · bundles, gift codes |
| Referral gifts | "customer referral" gift: code issued 106 · waiting for the opportunity 85 · active 47 · waiting for the review date 30 · plus star-level gifts (2-star, 3-star) |
| Users with a referrer | 63 |

## Keep / cut (decided 2026-10-23 unless marked)

| Old feature | Goal | Decision |
|---|---|---|
| Contracts list + detail | 1 | KEEP — the home screen |
| Offers ("Angebot") | 1, 5 | KEEP and make visible: the advisor's offers are the comparison the customer actually gets (6,685 in a year) — compare them side by side and accept in the app |
| Tickets / support | 2 | KEEP — chat-style threads + WhatsApp shortcut; staff create 90 % of tickets today, so the app must show answers and notify |
| Documents | 3 | KEEP — per-contract folders, download, upload, camera scan |
| Push notifications | 4 | KEEP — rebuilt with rules and preferences; the old `notifications` table is barely used |
| Profile | — | KEEP minimal |
| **Letters (Briefe)** | — | **CUT** (owner's decision; 4 uses in a year) |
| **Meter readings** | — | **CUT** (owner's decision; 7 readings in a year) |
| Product comparison | 5 | KEEP in a light form — see below |
| Referral | 6 | KEEP and simplify — 10 € voucher (rules below) |
| Loyalty points / star levels | 5, 6 | DECIDE — exists today (points for contracts, registration, loyalty year, renewals); keep, simplify or drop |
| Blogs / CMS pages | 5 | DECIDE — a small "tips" feed at most |
| E-signature, AI | — | Back-office side, not in the customer app for now |

## Product comparison in the app
Not hard to build — the comparison data and logic already exist on the website (energy tariff lookup API, qualification wizards for insurance). It was first proposed as a cut only to avoid keeping two copies of the same logic. The plan instead:
- **Self-service where the data exists:** electricity and gas — usage + postcode -> real tariffs (same API as the website).
- **Everything else:** a short guided form -> the advisor prepares offers -> the offers appear in the app to compare side by side and accept.
- One implementation behind the API, shown by both the website and the app.

## Referral rules (owner, 2026-10-23)
- Reward: a **10 € voucher (Gutschein)** for the referrer.
- Condition 1: the referrer has an **active contract** with Tarefe.
- Condition 2: the referred person **signs a contract** and **does not cancel it within 14 days** (the withdrawal period).
- The old CRM already tracks this flow ("waiting for the opportunity" -> "waiting for the review date" -> "code issued"), so the new rules match how staff work today.

## Messages the app must carry everywhere
- **All Tarefe services are free of charge — the customer is never charged for anything.**
- **We find the lowest price for each service, based on each person's own situation.**
