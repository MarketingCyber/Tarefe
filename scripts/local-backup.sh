#!/usr/bin/env bash
# Refreshes the local copy of the Tarefe project on the owner's laptop (see PROJECT-STATUS.md, "Keeping this file
# current"). Run from Git Bash in C:\Claude\Tarefe.
#
#   bash scripts/local-backup.sh          quick: code of the website + app (full git history), PROJECT-STATUS.md,
#                                         Claude's project notes and the laptop .env files → "Local backups/latest"
#   bash scripts/local-backup.sh --full   also the live database, uploaded files and server setup → a new dated folder
#                                         (dump checked with pg_restore, checksums written)
#
# The backup holds customer data and passwords: keep the folder on an encrypted drive, never upload or share it.
set -euo pipefail

ROOT="C:/Pourya/Tarefe/Local backups"
WEBSITE="C:/Claude/Tarefe"
APP="C:/Claude/Tarefe-app"
MEMORY="C:/Users/HoldCo/.claude/projects/C--Claude-Tarefe/memory"
KEY="C:/Users/HoldCo/.ssh/Tarefe/tarefe-privatekey.pem"
SERVER="root@87.106.38.19"
PROXY_PORT=10808

copy_quick_parts() { # $1 = target folder
  local t="$1"
  mkdir -p "$t/1-code" "$t/5-secrets" "$t/6-notes-and-tools/claude-memory"
  git -C "$WEBSITE" bundle create "$t/1-code/tarefe-website-and-crm.bundle" --all 2>/dev/null
  git -C "$APP" bundle create "$t/1-code/tarefe-app.bundle" --all 2>/dev/null
  git -C "$WEBSITE" bundle verify "$t/1-code/tarefe-website-and-crm.bundle" >/dev/null 2>&1 || { echo "website bundle FAILED verification"; exit 1; }
  git -C "$APP" bundle verify "$t/1-code/tarefe-app.bundle" >/dev/null 2>&1 || { echo "app bundle FAILED verification"; exit 1; }
  cp "$WEBSITE/PROJECT-STATUS.md" "$t/PROJECT-STATUS.md"
  cp "$MEMORY/"*.md "$t/6-notes-and-tools/claude-memory/"
  cp "$WEBSITE/.env" "$t/5-secrets/laptop-website.env"
  [ -f "$APP/.env" ] && cp "$APP/.env" "$t/5-secrets/laptop-app.env"
  # Uncommitted work isn't in a bundle: say so instead of silently missing it.
  local dirty
  dirty="$(git -C "$WEBSITE" status --porcelain; git -C "$APP" status --porcelain)"
  [ -n "$dirty" ] && printf 'Uncommitted changes at backup time (not in the bundles):\n%s\n' "$dirty" > "$t/1-code/UNCOMMITTED.txt" || rm -f "$t/1-code/UNCOMMITTED.txt"
  echo "code: website $(git -C "$WEBSITE" log -1 --format=%h), app $(git -C "$APP" log -1 --format=%h)"
}

remote() { ssh "${SSH[@]}" "$SERVER" "$1" 2>/dev/null; }

if [ "${1:-}" != "--full" ]; then
  T="$ROOT/latest"
  copy_quick_parts "$T"
  date '+%Y-%m-%d %H:%M' > "$T/UPDATED.txt"
  echo "quick backup → $T"
  exit 0
fi

# SSH directly when possible, else through the laptop's local proxy (direct connections are sometimes blocked).
SSH=(-i "$KEY" -o BatchMode=yes)
if ! ssh "${SSH[@]}" -o ConnectTimeout=8 "$SERVER" true 2>/dev/null; then
  SSH+=(-o "ProxyCommand=connect -S 127.0.0.1:$PROXY_PORT %h %p")
  ssh "${SSH[@]}" "$SERVER" true 2>/dev/null || { echo "server not reachable (direct or via proxy)"; exit 1; }
fi

T="$ROOT/$(date +%F)"
[ -e "$T" ] && T="$T-$(date +%H%M)"
mkdir -p "$T/2-database" "$T/3-files" "$T/4-server-config"
copy_quick_parts "$T"

echo "database…"
remote 'cd /opt/tarefe.de && docker compose exec -T db sh -c "pg_dump -U \$POSTGRES_USER -d \${POSTGRES_DB:-\$POSTGRES_USER} -Fc -Z 6"' > "$T/2-database/tarefe-production.dump"
[ "$(head -c 5 "$T/2-database/tarefe-production.dump")" = "PGDMP" ] || { echo "database dump FAILED"; exit 1; }
if docker exec tarefe-local-db-1 true 2>/dev/null; then
  docker exec -i tarefe-local-db-1 pg_restore -l < "$T/2-database/tarefe-production.dump" > "$T/2-database/contents-list.txt"
  echo "database: $(grep -c 'TABLE DATA' "$T/2-database/contents-list.txt") tables with data"
else
  echo "database: dump saved (Docker not running, table-of-contents check skipped)"
fi

echo "uploaded files…"
remote 'cd /opt/tarefe.de && tar cf - uploads' > "$T/3-files/uploads.tar"
local_files=$(tar --force-local -tvf "$T/3-files/uploads.tar" | awk '$1 !~ /^d/ {n++; s+=$3} END {print n" "s}')
server_files=$(remote 'cd /opt/tarefe.de && echo "$(find uploads -type f | wc -l) $(find uploads -type f -printf "%s\n" | awk "{s+=\$1} END {print s}")"')
echo "uploads: local $local_files / server $server_files (files bytes)"

echo "server setup…"
remote 'cd /opt/tarefe.de && tar czf - --exclude=app/src --exclude=app/node_modules --exclude=app/public/m docker-compose.yml docker-compose.yml.before-* Dockerfile ROUTING.md run-tariff-import.sh .env.example .last-openresty-backup offsite sgtm data openresty-backup-* app 2>/dev/null; true' > "$T/4-server-config/opt-tarefe.de-config.tgz"
remote 'tar czf - -C /opt/tarefesite/nginx conf.d 2>/dev/null; true' > "$T/4-server-config/openresty-routing-conf.d.tgz"
remote 'cd /opt/tarefe.de && tar czf - .env .env.before-* offsite.env' > "$T/5-secrets/server-env-files.tgz"

cat > "$T/README.md" <<'EOF'
# Tarefe — local backup

Made by scripts/local-backup.sh --full. What the project is and its state at backup time: PROJECT-STATUS.md.
Folder layout and how to restore each part: see the README of the 2026-11-09 backup (same layout):
1-code (git bundles: `git clone <bundle>`), 2-database (`pg_restore --no-owner --no-privileges -d <db> tarefe-production.dump`),
3-files (unpack into /opt/tarefe.de), 4-server-config, 5-secrets (passwords and keys), 6-notes-and-tools.
Contains customer data and passwords: keep it on an encrypted drive, never upload or share it.
EOF

(cd "$T" && find . -type f ! -name SHA256SUMS.txt | sort | xargs -d '\n' sha256sum > SHA256SUMS.txt)
echo "full backup → $T ($(du -sh "$T" | cut -f1))"
