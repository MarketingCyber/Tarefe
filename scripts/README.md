# Ops scripts

## Database backups (`backup-db.sh`)

Daily `pg_dump` of `tarefe_prod` to `/var/backups/tarefe-db/`, custom
format (`-Fc`), 14-day retention, self-verified with `pg_restore --list`
after every run (a dump that can't be parsed isn't a backup). See the
script's own header comment for what this does and doesn't cover — short
version: protects against corruption/bad-migration/human-error, not
against losing the VPS itself (no off-site copy configured).

### One-time setup on the VPS

```bash
mkdir -p /var/backups/tarefe-db
chmod +x /var/www/tarefe-next/scripts/backup-db.sh
crontab -e
```

Add this line (runs daily at 03:17 — off the hour, avoids piling onto
whatever else might be scheduled at :00):

```cron
17 3 * * * /var/www/tarefe-next/scripts/backup-db.sh
```

### Restoring from a backup

**Test this on a throwaway database first if you've never done it before
— don't let an incident be the first time you run a restore.**

```bash
# List what's in a dump without touching any database:
sudo -u postgres pg_restore --list /var/backups/tarefe-db/tarefe_prod_2026-08-30_031700.dump

# Restore into a NEW database (safe — doesn't touch the live one):
sudo -u postgres createdb tarefe_restore_test
sudo -u postgres pg_restore -d tarefe_restore_test /var/backups/tarefe-db/tarefe_prod_2026-08-30_031700.dump

# Restore OVER the live database (destructive — only during a real
# incident, and only after confirming the app is stopped):
pm2 stop tarefe-next
sudo -u postgres dropdb tarefe_prod
sudo -u postgres createdb tarefe_prod
sudo -u postgres pg_restore -d tarefe_prod /var/backups/tarefe-db/tarefe_prod_<TIMESTAMP>.dump
pm2 start tarefe-next
```

### Checking backups are actually running

```bash
tail -20 /var/backups/tarefe-db/backup.log
ls -la /var/backups/tarefe-db/*.dump
```

If there's no `.dump` file from within the last 25 hours, the cron job
isn't running — check `crontab -l` and `/var/log/syslog` (or
`grep CRON /var/log/syslog`) for cron's own errors.

## Notification rules engine (`run-notification-rules.ts`)

Phase 8/11 "Smart Notifications" — rule-based, not AI-based (no LLM API
credentials are configured for the live app to call). Runs hourly,
evaluates a fixed set of real business rules against existing data, and
creates real in-app `Notification` rows via the same dedup-aware pattern
`src/lib/notifications.ts`'s `notifyUser()` uses (a `dedupeKey` per
rule+entity means re-running the script every hour doesn't spam the same
person about the same thing over and over — see the script's own header
comment and `prisma/schema.prisma`'s `Notification.dedupeKey` comment).

Current rules:
- **Stale assigned lead** — `status=NEW`, assigned, older than 24h → notifies the assigned advisor.
- **Stale unassigned lead** — `status=NEW`, unassigned, older than 4h → notifies every ADMIN (escalation).
- **Contract deadline approaching** — `ACTIVE`, `cancellationDeadline` within 14 days → notifies the customer.
- **Overdue task** — `OPEN`, `dueAt` in the past, assigned → notifies the assignee.
- **Ticket SLA breach** — not `COMPLETED`, most recent message is from the customer (or has no messages yet), waiting over 24h → notifies the assigned advisor, or every ADMIN if unassigned. Same SLA definition as the `SLA` column on `/ops/tickets` and the badge on a ticket's own page (`src/lib/sla.ts`).
- **Application stalled** — `SUBMITTED` or `PROVIDER_REVIEW`, unchanged for over 72h → notifies the assigned advisor, or every ADMIN if unassigned.

### One-time setup on the VPS

```bash
crontab -e
```

Add this line (runs at the top of every hour):

```cron
0 * * * * cd /var/www/tarefe-next && npm run notify-rules >> /var/log/tarefe-notify-rules.log 2>&1
```

### Checking it's actually running

```bash
tail -30 /var/log/tarefe-notify-rules.log
```

Each run logs a one-line summary (counts per rule). No output file at all
means the cron job isn't firing — check `crontab -l` the same way as the
backup job above.

### Adding a new rule

Add a new `async function ruleX() { ... }` following the existing ones'
shape (query, loop, call `notify()` with a `dedupeKey` unique to that
rule+entity), then add it to the `results` object in `main()`. Always give
a new rule a `dedupeKey` — a rule without one will re-notify on every
single run.
