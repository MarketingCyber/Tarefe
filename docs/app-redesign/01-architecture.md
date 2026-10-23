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
1. **Token API for the app** — sign in returns a short-lived access token + a refresh token (the site's NextAuth login uses cookies, which a mobile app cannot rely on). Biometric unlock happens on the phone and unlocks the stored refresh token.
2. **Device registry** — table of devices (user, platform, Firebase token, language, last seen). Tokens are refreshed by the app; dead tokens are removed when Firebase reports them.
3. **Notification service** — one place that sends a message through the right channels (push, email, WhatsApp) from rules (renewal due, document requested, ticket answered, offers). The site already has `src/lib/notifications.ts` and `scripts/run-notification-rules.ts` to build on.
4. **Referral** — referral codes, who invited whom, status, reward rules (rules still to be decided by the owner).
5. **Product cards / offers** — content the CRM controls and the app displays (goal 5).
6. **API versioning + documentation** — OpenAPI description, so the app and the API can be checked against each other.
7. **Dynamics adapter (later)** — outbound queue with retries and idempotency keys.

## Data
- Postgres is the single source of truth. The old MySQL CRM is read ONCE for migration (mapping in a later document), never kept in sync live.
- Personal data stays in the EU (the VPS is in Germany). Privacy policy and the app store privacy labels are updated before release (the old iOS listing declares tracking data; the new app should declare as little as possible).

## Security basics for the app API
- Rate limits per IP and per account, lockout after repeated failures, 2-step login for staff (exists), refresh-token rotation, revoke-all on password change.
- Document files are never public URLs: every download goes through the API and checks the owner (exists on the site today, same pattern).
