# Roadmap

## Phase 0 — Discovery (about 1 week)
- [x] Goals, technology and central-CRM decisions (README.md)
- [x] Old app inventory from stores and code (02)
- [ ] Usage numbers (Firebase Analytics + read-only counts on the old CRM) -> final keep/cut list
- [ ] Who holds the old mobile app's source code? (reference only; we do not reuse it)
- [ ] Referral rules (reward, who pays, limits)
- [ ] Docker Desktop on the laptop; local stack running

## Phase 1 — Design (1–2 weeks)
- [x] Information architecture: 5 tabs — Home, Contracts, Offers, Documents, Support (Profile + referral behind the avatar); support is per contract (own chat + own requests)
- [x] Flows for the six goals -> clickable prototype (prototype/index.html, design canvas with 11 boards at Galaxy A55 size)
- [ ] Test with 3–5 customers (script: 07-customer-test.md) — owner runs it
- [x] Notification catalogue: events, channels, texts fa/de/ru (06-notifications.md; de/ru need a native-speaker review)

## Phase 2 — Foundation (back end first)
- Token API (sign-in, refresh, devices), data model additions (devices, referrals, offers, notification preferences)
- Old CRM -> new Postgres migration mapping (document), then a dry run on anonymised data
- Staging stack on the VPS

## Phase 3 — App first release
- **Owner's choice (2026-10-23): build the app back end (the API part of phase 2) and the Expo project together.** Migration of old CRM data and the VPS staging stack follow later.
- Expo project, sign-in with biometric unlock, contracts hub, documents (download, upload, camera scan), support threads, push notifications
- Internal test (TestFlight / Play internal track), then store release replacing the old listing (same store entries, so existing users update)

## Phase 4 — Growth
- Referral, product cards and offers, renewal reminders, notification preferences, campaigns from the back office

## Phase 5 — Optional
- Dynamics 365 adapter; retire the old Node/MySQL CRM; archive old data
