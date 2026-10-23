# Environments and how code moves

```
 laptop (local dev)  ──►  QA on the laptop  ──►  staging on the VPS  ──►  production on the VPS
 C:\Claude\Tarefe         checklist + tests        /opt/tarefe.de/staging    /opt/tarefe.de
```

## 1. Local (the laptop is the first staging) — running since 2026-10-23

Pieces: Docker Desktop (Postgres 16 in a container, same version as the server) + the website itself running on the laptop with `next dev` (fast reload).

| What | How |
|---|---|
| Start the database | `docker compose -f deploy/docker-compose.local.yml up -d` (port 5434 on the laptop only) |
| Stop the database | `docker compose -f deploy/docker-compose.local.yml down` (data stays in the volume `tarefe-local-pgdata`) |
| Start the website | `npm run dev` -> http://localhost:3000 (or the "tarefe-dev" entry in .claude/launch.json) |
| Create / update tables | `npx prisma db push` |
| Starter content + LOCAL test accounts | `SEED_TEST_USERS=1 npm run seed` (advisor@tarefe.de, customer@tarefe.de, mfa-test@tarefe.de — passwords are in prisma/seed.ts; local only) |
| Customer comments | `npx tsx scripts/load-customer-comments.ts` |
| Energy tariffs | copy the 12 provider Excel exports into `data/energy-tariffs/` (git-ignored), then `npx tsx scripts/replace-energy-tariffs.ts` and `npx tsx scripts/add-energy-tariffs.ts` (set `NODE_OPTIONS=--max-old-space-size=6000` first) |

### The mobile app (separate repo `C:\Claude\Tarefe-app`, Expo SDK 58)
| What | How |
|---|---|
| Sample data for the app (local DB only) | `npx tsx scripts/seed-app-sample.ts` -> sign in as app-test@tarefe.de; the 6-digit code is printed in the `next dev` console (no email provider yet) |
| App in the browser | in Tarefe-app: `npx expo start --web` -> http://localhost:8081 (or the "tarefe-app-web" entry in .claude/launch.json) |
| App on a phone | Expo Go / development build; set `EXPO_PUBLIC_API_URL` in Tarefe-app/.env to the laptop's LAN address |
| Staff side of the app chat | http://localhost:3000/ops/conversations (local test advisor account from prisma/seed.ts) |

Settings: `.env` in the project root (git-ignored) holds `DATABASE_URL` for the local database and a local `AUTH_SECRET`.

Rules: test data only — never a copy of real customer data; if real shapes are needed, an anonymised extract. The mobile app (later) runs on the Android emulator / a real phone with Expo; push tests use a Firebase DEV project. iOS builds are made in Expo's cloud (EAS Build); iPhone testing goes through TestFlight.

## 2. QA before anything leaves the laptop
- Type-check, lint, automated tests (Playwright for the web, API tests, app unit tests).
- A written checklist per release: the six goals, languages fa/de/ru, RTL, small phones, offline, wrong-input cases, privacy.

## 3. Staging on the VPS
- A second stack in /opt/tarefe.de/staging (own database, own containers, own folders), reachable only at a staging address, password-protected and hidden from search engines.
- Separate Firebase STAGING project and test accounts.

## 4. Production
- Released from the git main branch only after QA and staging are green: copy the changed files into /opt/tarefe.de/app, `docker compose build web && docker compose up -d web`; database changes are applied after a backup.
- Rollback = previous image + the pre-release database backup.

## Git
- `main` = what is live. Work happens on short feature branches. Every release is a tagged commit.
- Secrets never go into git; each environment has its own .env.

## App switch (APP_ENABLED)

The app back end (`/api/v1`) and its two staff pages (`/ops/conversations`, `/ops/app-banners`) are in this repo but stay **off** unless the server env has `APP_ENABLED=true` (`src/lib/app-flag.ts`; off = 404 + hidden menu entries). The laptop `.env` turns it on. Production leaves it out until the owner publishes the app, so a normal website deploy cannot publish the app by accident. To go live with the app: add `APP_ENABLED=true` to `/opt/tarefe.de/.env` and recreate the web container.
