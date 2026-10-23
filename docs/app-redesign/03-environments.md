# Environments and how code moves

```
 laptop (local dev)  ──►  QA on the laptop  ──►  staging on the VPS  ──►  production on the VPS
 C:\Claude\...            checklist + tests        /opt/tarefe.de/staging    /opt/tarefe.de
```

## 1. Local (the laptop is the first staging)
- Same Docker setup as the server (docker compose: web, Postgres), so "works on my laptop" means "works on the server".
- Own test database with fake customers only. NEVER a copy of real customer data; if real shapes are needed, an anonymised extract.
- The mobile app runs on the Android emulator / a real phone with Expo; push tests use a Firebase DEV project.
- Needs on this laptop: Docker Desktop (with WSL2), Node (installed), git (installed), Android Studio emulator (later). iOS builds are made in Expo's cloud (EAS Build) because they need a Mac otherwise; testing on iPhones goes through TestFlight.

## 2. QA before anything leaves the laptop
- Type-check, lint, automated tests (Playwright for the web, API tests, app unit tests).
- A written checklist per release: the six goals, languages fa/de/ru, RTL, small phones, offline, wrong-input cases, privacy.

## 3. Staging on the VPS
- A second stack in /opt/tarefe.de/staging (own database, own containers, own folders), reachable only at a staging address, password-protected and hidden from search engines.
- Uses a separate Firebase STAGING project and test accounts. Purpose: a final look on the real server before release, and testers' builds.

## 4. Production
- Released from the git main branch only after QA and staging are green. Deployment = the same compose file, new image; database changes are applied with a backup taken first.
- Rollback = previous image + the pre-release database backup.

## Git
- `main` = what is live. Work happens on short feature branches. Every release is a tagged commit.
- Secrets never go into git; each environment has its own .env.
