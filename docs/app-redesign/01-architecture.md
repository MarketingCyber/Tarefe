# Architecture

```
   Mobile app (React Native / Expo) ──┐
   Website (Next.js, public) ─────────┼──►  Tarefe CRM + API  ──►  Dynamics 365 (optional, last)
   Staff back office (/ops) ──────────┘     Next.js route handlers + Postgres (Prisma)
                                                 │
                                                 ├──►  Firebase Cloud Messaging  ──►  Android + iPhone (APNs via Firebase)
                                                 ├──►  Email, WhatsApp (same notification rules)
                                                 └──►  File storage (documents)
```

## One backend, three clients
- The website and the back office already live in this repository (C:\Claude\Tarefe). They stay here and become the CRM.
- The app is a separate project (its own repository, `Tarefe-app`, created when we start building). It talks only to the versioned API (`/api/v1/...`). It never touches the database.

## What has to be added to the current back end
1. **Token API for the app** — sign in (email + one-time code sent by the email API, no SMS) returns a short-lived access token + a refresh token (the site's NextAuth login uses cookies, which a mobile app cannot rely on). Biometric unlock happens on the phone and unlocks the stored refresh token.
2. **Device registry** — table of devices (user, platform, Firebase token, language, last seen). Tokens are refreshed by the app; dead tokens are removed when Firebase reports them.
3. **Notification service** — one place that sends a message through the right channels (push, email, WhatsApp) from rules (renewal due, document requested, ticket answered, offers). The site already has `src/lib/notifications.ts` and `scripts/run-notification-rules.ts` to build on.
4. **WhatsApp channel (LATER, only if needed; not in the first release)** — WhatsApp Business Platform (Cloud API) webhook into the central CRM: incoming WhatsApp messages and media join the customer's single conversation (matched by phone number; unknown numbers become a lead), staff replies from /ops go out on WhatsApp inside Meta's 24-hour service window, and anything outside the window (deadline reminders, "your document arrived") uses pre-approved message templates. Needs: a Meta Business account + verified number (Meta's coexistence mode can keep the WhatsApp Business app on the same number; confirm for Tarefe's number), a data-processing agreement with Meta, and the customer's opt-in for WhatsApp. Sensitive documents (ID, IBAN) are better uploaded in the app. Meta charges per template conversation; the customer never pays.
   **How Tarefe works today (owner, 2026-10-23):** each head of support has their own phone number and their own WhatsApp account, and customers write to "their" person. So the CRM keeps an assigned advisor per customer (with a backup), and every advisor number joins ONE Meta business account (one business account can hold several numbers). Messages on any advisor number land in that customer's single conversation and stay with the company when an advisor is away or leaves. Steps: (1) first release: the app's WhatsApp button opens the assigned advisor's own number (wa.me link) and the in-app chat runs in the CRM; (2) then each advisor number is connected to the API, in coexistence mode if they keep using the WhatsApp Business app on their phone. Only WhatsApp Business app accounts can do coexistence, not personal WhatsApp accounts; a personal account would first move to the Business app on the same phone, which keeps its chats.
5. **Referral** — random, non-guessable referral codes (never derived from the name), who invited whom, status, reward rules (rules still to be decided by the owner).
6. **Product cards / offers** — content the CRM controls and the app displays (goal 5).
7. **API versioning + documentation** — OpenAPI description, so the app and the API can be checked against each other.
8. **Dynamics adapter (later)** — outbound queue with retries and idempotency keys.

## App API (built 2026-10-23, `src/app/api/v1/`)
| Endpoint | What it does |
|---|---|
| `POST auth/code` | email a 6-digit sign-in code (rate-limited; same answer whether or not the account exists) |
| `POST auth/verify` | check the code, create the customer on first sign-in, return access + refresh token |
| `POST auth/refresh` / `POST auth/logout` | rotate the refresh token (reuse = session revoked) / end this phone's session |
| `GET, PATCH me` | profile (name, language) |
| `GET contracts`, `GET contracts/:id` | contracts + monthly total; one contract with documents, its conversation and open requests |
| `GET conversations` | the Support list: one row per contract + general, last message, unread, open requests |
| `GET conversations/:id`, `POST .../messages`, `POST .../read`, `POST .../requests` | one conversation (messages, requests, topics); write; mark read; open a request |
| `GET, POST documents`, `GET documents/:id` | list (grouped by contract, "from Tarefe" flag), upload (PDF/JPG/PNG/WEBP, 10 MB), download own file |
| `POST, DELETE devices` | push token registration |
| `GET referral` | random referral code (TRF-XXXX-XXXX), reward rule, share text |
Staff side: `/ops/conversations` (list + reply + assign); replies and status changes on `/ops/tickets/:id` also reach the app chat.
Not yet: email provider (`EMAIL_PROVIDER`, src/lib/email.ts), server-side push sending, file opening in the app.

## Data
- **Support model (per contract):** `Conversation` (customer, contract or none for "general", assigned advisor, last read per side) → `Message` (sender customer/staff/system, text, attachments → `Document` filed under the same contract, optional ticket id). `ServiceRequest` (the ticket) gets `contractId` + `conversationId`, a topic from a per-service list, and status registered / in progress / done (old CRM: waiting for an answer / answered / closed). Creating or closing a request writes a system message into the conversation, so the chat shows the whole story. Unread counts come from "last read" per side. Staff in /ops see the same conversation with the contract and its open requests beside it.
- Postgres is the single source of truth. The old MySQL CRM is read ONCE for migration (mapping in a later document), never kept in sync live.
- Personal data stays in the EU (the VPS is in Germany). Privacy policy and the app store privacy labels are updated before release (the old iOS listing declares tracking data; the new app should declare as little as possible).

## Security basics for the app API
- Rate limits per IP and per account, lockout after repeated failures, 2-step login for staff (exists), refresh-token rotation, revoke-all on password change.
- Document files are never public URLs: every download goes through the API and checks the owner (exists on the site today, same pattern).
