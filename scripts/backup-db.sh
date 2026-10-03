#!/usr/bin/env bash
# Daily Postgres backup for tarefe_prod — Phase 12.4 (Reliability), a real
# gap: this production DB holds real customer PII, financial/insurance
# data, and MFA secrets, and had zero backup strategy before this. Runs
# via cron (see scripts/README.md for the crontab line) as root, using
# `sudo -u postgres pg_dump` — Postgres here uses local peer/trust auth
# over the unix socket, so no separate password/credential is needed.
#
# Scope, honestly: this is ON-DISK, ON-VPS backup only. It protects
# against data corruption, a bad migration, or human error (the far more
# common failure modes) — it does NOT protect against total VPS loss or
# compromise, since there is no off-site replication target configured
# (no cloud storage credentials, same constraint noted for the Phase 12
# monitoring gap). Copying BACKUP_DIR's contents off the VPS periodically
# (e.g. `scp`, as this project's own deploy process already does routinely)
# is a real, deliberate follow-up, not silently assumed to be covered here.

set -euo pipefail

DB_NAME="tarefe_prod"
BACKUP_DIR="/var/backups/tarefe-db"
RETENTION_DAYS=14
TIMESTAMP=$(date +%Y-%m-%d_%H%M%S)
DUMP_FILE="${BACKUP_DIR}/${DB_NAME}_${TIMESTAMP}.dump"
LOG_FILE="${BACKUP_DIR}/backup.log"

mkdir -p "$BACKUP_DIR"

log() {
  echo "[$(date -Iseconds)] $1" >> "$LOG_FILE"
}

# Custom format (-Fc): compressed, and the only format pg_restore can do
# selective/parallel restores from — plain SQL dumps can't.
#
# `> "$DUMP_FILE"` (shell redirection), not pg_dump's own `-f` flag: this
# script runs as root, but pg_dump runs as the postgres user (via `sudo -u
# postgres`) — the postgres user can't write into a root-owned directory,
# and chown-ing the backup directory to postgres just to work around that
# is more moving parts than needed. Shell redirection is set up by the
# CALLING shell (root) before sudo execs, so root opens/creates the file
# (which it can, anywhere) and postgres only ever writes into the already-
# open file descriptor it inherits — confirmed this actually matters by
# hitting the permission error with -f on the first real run, not assumed.
if sudo -u postgres pg_dump -Fc "$DB_NAME" > "$DUMP_FILE" 2>>"$LOG_FILE"; then
  SIZE=$(du -h "$DUMP_FILE" | cut -f1)
  log "OK: $DUMP_FILE ($SIZE)"
else
  log "FAILED: pg_dump exited non-zero — see errors above"
  rm -f "$DUMP_FILE" # never leave a partial/corrupt dump behind claiming to be a backup
  exit 1
fi

# A dump that isn't verifiably readable isn't a backup, it's a file that
# looks like one — pg_restore --list parses the archive's TOC without
# touching any database, so this confirms the dump is structurally intact.
if ! sudo -u postgres pg_restore --list "$DUMP_FILE" > /dev/null 2>>"$LOG_FILE"; then
  log "FAILED: $DUMP_FILE did not pass pg_restore --list verification"
  exit 1
fi

# Retention: delete dumps older than RETENTION_DAYS so this never grows unbounded.
DELETED=$(find "$BACKUP_DIR" -name "${DB_NAME}_*.dump" -mtime "+${RETENTION_DAYS}" -print -delete | wc -l)
[ "$DELETED" -gt 0 ] && log "Pruned $DELETED backup(s) older than ${RETENTION_DAYS} days"

log "Backup cycle complete"
