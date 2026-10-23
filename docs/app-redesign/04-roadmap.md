# Roadmap

## Phase 0 — Discovery (about 1 week)
- [x] Goals, technology and central-CRM decisions (README.md)
- [x] Old app inventory from stores and code (02)
- [ ] Usage numbers (Firebase Analytics + read-only counts on the old CRM) -> final keep/cut list
- [ ] Who holds the old mobile app's source code? (reference only; we do not reuse it)
- [ ] Referral rules (reward, who pays, limits)
- [ ] Docker Desktop on the laptop; local stack running

## Phase 1 — Design (1–2 weeks)
- Information architecture: 5 tabs — Home, Contracts, Documents, Support, Profile (+ referral inside Profile/Home)
- Flows for the six goals; wireframes -> clickable prototype; test with 3–5 customers
- Notification catalogue: which events, which channel, what text (fa/de/ru)

## Phase 2 — Foundation (back end first)
- Token API (sign-in, refresh, devices), data model additions (devices, referrals, offers, notification preferences)
- Old CRM -> new Postgres migration mapping (document), then a dry run on anonymised data
- Staging stack on the VPS

## Phase 3 — App first release
- Expo project, sign-in with biometric unlock, contracts hub, documents (download, upload, camera scan), support threads, push notifications
- Internal test (TestFlight / Play internal track), then store release replacing the old listing (same store entries, so existing users update)

## Phase 4 — Growth
- Referral, product cards and offers, renewal reminders, notification preferences, campaigns from the back office

## Phase 5 — Optional
- Dynamics 365 adapter; retire the old Node/MySQL CRM; archive old data
