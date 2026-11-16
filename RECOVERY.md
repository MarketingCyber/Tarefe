# Recovering Tarefe from zero

How to get the website, the CRM, the app and all their data back if the laptop, the server, or both are lost.
No passwords are written here — they live in the owner's password manager (list in §1). Keep this file current with
`PROJECT-STATUS.md`. Last checked: **2026-11-16** (restore test, §6).

## 1. What must be in the owner's password manager

Without these, the backups below cannot be opened or the systems reached. Keep them in a password manager
(1Password / Bitwarden / …), never only on one laptop.

| Item | Why |
|---|---|
| **Server SSH private key** (`tarefe-privatekey.pem`) and the **server provider's control-panel login** (the company renting out 87.106.38.19) | Log in to the server; the provider's web console / rescue system is the way back in if the key is lost |
| **Off-site backup of the new stack** — the values in `/opt/tarefe.de/offsite.env`: restic repository (STRATO HiDrive S3 bucket `tarefebackup`), **restic password**, S3 access key + secret | Open the encrypted nightly copy (database dumps, uploads, settings, server setup) |
| **Old system's backup** — the values in `/etc/restic/backup.env`: repository `s3:https://s3.hidrive.strato.com/tarefe`, restic password, S3 keys | Open the old system's copy (WordPress, old site / API / panel incl. the 34 GB `cdn.tarefe.de` files, MySQL) |
| **STRATO HiDrive account** | Manage both buckets |
| **GitHub** login + 2FA recovery codes (organisation `MarketingCyber`) | Code of the website / CRM (`Tarefe`) and the app (`Tarefe-app`) |
| **Cloudflare** login | DNS of tarefe.de (and the certificate for sgtm.tarefe.de) |
| Google (Ads, Analytics, Tag Manager, OAuth client), Meta (Business, pixel), Zoho (mail) | Tracking, sign-in with Google, e-mail |
| Old CRM (Dynamics, `tarefe.online`) login | Write-back and the mirror; the server holds it in `.env` too |
| Apple / Google developer accounts, Expo, Firebase (when the app launches) | Publish and update the app |

## 2. Where every piece lives

| What | Copies |
|---|---|
| Website + CRM code | GitHub `MarketingCyber/Tarefe` · server `/opt/tarefe.de/app/src` · laptop |
| App code (Expo) | GitHub `MarketingCyber/Tarefe-app` (private) · laptop |
| `PROJECT-STATUS.md`, this file, design / planning docs (`docs/`) | GitHub (in `Tarefe`) |
| Live database (accounts, leads, contracts, requests, CRM data incl. the old-CRM mirror, referrals, QC reports …) | Server nightly `pg_dump` (14 days, `/opt/tarefe.de/backups`) · **off-site encrypted copy** (restic → STRATO `tarefebackup`, nightly 03:30 UTC, 14 daily / 8 weekly / 12 monthly) |
| Uploaded files (customer documents, old-CRM note files) | `/opt/tarefe.de/uploads` · off-site copy |
| Server settings + secrets (`.env`) | Server · off-site copy (encrypted) |
| Server setup: `docker-compose.yml`, `Dockerfile`, `ROUTING.md`, `run-tariff-import.sh`, the off-site script, the OpenResty routing (`/opt/tarefesite/nginx/conf.d`) | Server · off-site copy under `/data/stack` (since 2026-11-16) · templates in the repo (`deploy/`) |
| Server-side GTM (`sgtm`), tariff data (`data`) | Server · off-site copy |
| Old system: WordPress, old site / API / panel (`/opt/tarefesite/node-app` incl. `public/` = the 34 GB `cdn.tarefe.de` files), MySQL | Server · old restic backup (STRATO `tarefe`, daily 03:00 UTC; monthly config copy). Restore steps: `/root/RESTORE-RUNBOOK.md` on the server |
| Old CRM (Dynamics 365) | The CRM developer's server (their backups) · our full mirror of its data in the live database (without its stored passwords / secrets) |
| Laptop extras: Claude's notes, local backup folder `C:\Pourya\Tarefe\Local backups` | Laptop only — copy the backup folder to an encrypted external drive |

## 3. Lost laptop (server is fine)

1. New laptop: install Git, Node.js (LTS), Docker Desktop, an SSH client.
2. SSH key: take it from the password manager to `C:\Users\<you>\.ssh\Tarefe\tarefe-privatekey.pem`. If it is gone
   too: create a new key pair, add its public key to `/root/.ssh/authorized_keys` through the server provider's
   web console, and remove the old key's line there.
3. Code: `git clone git@github.com:MarketingCyber/Tarefe.git C:\Claude\Tarefe` and
   `git clone git@github.com:MarketingCyber/Tarefe-app.git C:\Claude\Tarefe-app` (a GitHub SSH key is needed for
   cloning; add the new laptop's public key in GitHub settings).
4. Local settings: copy `/opt/tarefe.de/.env.example` → `.env` and fill in local values (local database on port
   5434, `CRM_WRITES="dry"`); never copy the production `.env` to the laptop unless needed.
5. Local database: `docker compose -f deploy/docker-compose.local.yml up -d`, `npx prisma db push`, `npx prisma db seed`.
   For real data, restore last night's dump (§4 step 3) into the local database.
6. Continue: deploys as in `PROJECT-STATUS.md` §10.

## 4. Lost server (laptop is fine, or after §3)

1. New server (Rocky Linux or similar), Docker + Docker Compose, firewall 80 / 443 / 22.
2. Install restic, put the off-site values (§1) into an env file, then:
   ```
   restic snapshots --host tarefe-next
   restic restore latest --host tarefe-next --target /restore
   ```
   This gives `/restore/data/{backups,uploads,data,sgtm,stack}`.
3. Stack: `mkdir -p /opt/tarefe.de` → copy `stack/docker-compose.yml`, `stack/Dockerfile`, `stack/ROUTING.md`,
   `stack/run-tariff-import.sh`, `stack/env` (→ `.env`), `uploads/`, `data/`, `sgtm/`, `backups/`; the off-site
   script to `offsite/run.sh`; recreate `offsite.env` from the password manager. Code:
   `git clone … /opt/tarefe.de/app` (or `git archive` from the laptop as in a deploy).
4. Database: `docker compose up -d db`, then
   `docker compose exec -T db sh -c 'pg_restore -U $POSTGRES_USER -d $POSTGRES_DB --no-owner --no-privileges' < backups/<newest>.dump`.
5. `docker compose build web && docker compose up -d` (web, backup, offsite, crm-sync). The old-CRM mirror continues
   from where the dump left off.
6. Routing: OpenResty (or any reverse proxy) on 80 / 443 with `stack/openresty-conf.d/tarefe-next.conf`
   (→ `127.0.0.1:3100`) and `sgtm-tarefe.conf`; certificates with certbot (Cloudflare DNS plugin for sgtm).
7. Old system (if it is still needed): restore the old restic repository (§1) following `RESTORE-RUNBOOK.md`
   (a copy of it is in the old repository's monthly config snapshot).
8. DNS: in Cloudflare, point tarefe.de, www, sgtm (and the old subdomains if restored) to the new server's IP.
9. Check: `https://tarefe.de/fa` = 200, `https://tarefe.de/api/v1/me` = 404 (app off), sign in to `/ops`, the CRM
   sync log shows `sync round 200`, the off-site log shows `backup ok` the next night.

## 5. Lost both

Password manager → §3 steps 1–3 (code from GitHub) → §4 (everything else from STRATO). Nothing needed lives only
on the laptop once the app code is on GitHub and the password-manager items in §1 exist.

## 6. Restore test

| Date | What | Result |
|---|---|---|
| 2026-11-16 | Latest off-site snapshot (STRATO) → newest database dump (`tarefe_prod_2026-11-16_0951.dump`, 308 MB) restored into a scratch database; one uploaded file restored | **Passed**: `pg_restore` without errors; users 4 / leads 63 / activity logs 55 identical to live; old-CRM mirror 392,509 vs 392,542 live and copied note files 1,840 vs 1,841 — the difference is what the per-minute sync added after the dump; restored file byte-identical (SHA-256). Scratch database and files removed |

Repeat every few months (and after big changes): restore into a scratch database, compare counts, drop it.
