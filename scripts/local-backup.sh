#!/usr/bin/env bash
# Refreshes the local copy of the Tarefe project on the owner's laptop (see PROJECT-STATUS.md, "Keeping this file
# current"). Run from Git Bash in C:\Claude\Tarefe.
#
#   bash scripts/local-backup.sh          quick: code of the website + app (full git history), PROJECT-STATUS.md,
#                                         Claude's project notes and the laptop .env files → "Local backups/latest"
#   bash scripts/local-backup.sh --full   also the live database, uploaded files and server setup → a new dated folder
#                                         (server's nightly DB dump; resumable downloads; checksums written)
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

# -n: never reads stdin (it runs inside `while read` loops).
remote() { ssh -n "${SSH[@]}" "$SERVER" "$1" 2>/dev/null; }

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

# The laptop's link to the server is slow (~30 KB/s) and drops long connections, so nothing is streamed in one go:
# every large part is a file on the server, fetched in resumable pieces and checked by SHA-256 against the server.
# The live database is never dumped from here (a dump over this link held a read open for 30+ min and blocked a
# deploy's schema change on 2026-11-11) — the server's own nightly dump (backup service, /opt/tarefe.de/backups) is used.
fetch() { # $1 = file on the server, $2 = local file; resumes a partial download, retries dropped connections
  local src="$1" dst="$2" size have tries=0
  size=$(remote "stat -c %s '$src'") || { echo "missing on server: $src"; exit 1; }
  touch "$dst"
  while :; do
    have=$(stat -c %s "$dst")
    [ "$have" -ge "$size" ] && break
    tries=$((tries + 1))
    [ "$tries" -gt 40 ] && { echo "download kept failing: $src ($have of $size bytes)"; exit 1; }
    remote "tail -c +$((have + 1)) '$src'" >> "$dst" || sleep 5
  done
  [ "$(remote "sha256sum '$src'" | cut -d' ' -f1)" = "$(sha256sum "$dst" | cut -d' ' -f1)" ] || { echo "checksum MISMATCH: $src"; exit 1; }
}

T="$ROOT/$(date +%F)"
[ -e "$T" ] && T="$T-$(date +%H%M)"
mkdir -p "$T/2-database" "$T/3-files" "$T/4-server-config"
copy_quick_parts "$T"

echo "database (server's latest nightly dump)…"
DUMP=$(remote 'ls -1t /opt/tarefe.de/backups/tarefe_prod_*.dump | head -1')
[ -n "$DUMP" ] || { echo "no nightly dump on the server"; exit 1; }
fetch "$DUMP" "$T/2-database/$(basename "$DUMP")"
[ "$(head -c 5 "$T/2-database/$(basename "$DUMP")")" = "PGDMP" ] || { echo "database dump FAILED"; exit 1; }
if docker exec tarefe-local-db-1 true 2>/dev/null; then
  docker exec -i tarefe-local-db-1 pg_restore -l < "$T/2-database/$(basename "$DUMP")" > "$T/2-database/contents-list.txt"
  echo "database: $(basename "$DUMP"), $(grep -c 'TABLE DATA' "$T/2-database/contents-list.txt") tables with data"
else
  echo "database: $(basename "$DUMP") saved (Docker not running, table-of-contents check skipped)"
fi

# Uploaded files: a local mirror ("uploads-mirror", next to the dated folders) gets only new / changed files; the
# dated backup gets a tar of the mirror. Files are named by random ids and rarely change, so after the first copy
# this is small.
echo "uploaded files…"
MIRROR="$ROOT/uploads-mirror"
mkdir -p "$MIRROR"
remote 'cd /opt/tarefe.de && find uploads -type f -printf "%s %p\n"' > "$T/3-files/server-file-list.txt"
fetched=0
while read -r size path; do
  local_path="$MIRROR/$path"
  [ -f "$local_path" ] && [ "$(stat -c %s "$local_path")" = "$size" ] && continue
  mkdir -p "$(dirname "$local_path")"
  rm -f "$local_path"
  fetch "/opt/tarefe.de/$path" "$local_path"
  fetched=$((fetched + 1))
done < "$T/3-files/server-file-list.txt"
tar --force-local -cf "$T/3-files/uploads.tar" -C "$MIRROR" uploads
echo "uploads: $(wc -l < "$T/3-files/server-file-list.txt") files on the server, $fetched downloaded this time"

echo "server setup…"
TMP="/tmp/tarefe-local-backup-$$"
remote "mkdir -p $TMP && cd /opt/tarefe.de && (tar czf $TMP/config.tgz --exclude=app/src --exclude=app/node_modules --exclude=app/public/m docker-compose.yml docker-compose.yml.before-* Dockerfile ROUTING.md run-tariff-import.sh .env.example .last-openresty-backup offsite sgtm data openresty-backup-* app 2>/dev/null; true) && (tar czf $TMP/routing.tgz -C /opt/tarefesite/nginx conf.d 2>/dev/null; true) && tar czf $TMP/env.tgz .env .env.before-* offsite.env"
fetch "$TMP/config.tgz" "$T/4-server-config/opt-tarefe.de-config.tgz"
fetch "$TMP/routing.tgz" "$T/4-server-config/openresty-routing-conf.d.tgz"
fetch "$TMP/env.tgz" "$T/5-secrets/server-env-files.tgz"
remote "rm -rf $TMP"

cat > "$T/README.md" <<'EOF'
# Tarefe — local backup

Made by scripts/local-backup.sh --full. What the project is and its state at backup time: PROJECT-STATUS.md.
Folder layout and how to restore each part: see the README of the 2026-11-09 backup (same layout):
1-code (git bundles: `git clone <bundle>`), 2-database (`pg_restore --no-owner --no-privileges -d <db> tarefe-production.dump`),
3-files (unpack into /opt/tarefe.de; server-file-list.txt = what the server had), 4-server-config, 5-secrets (passwords and keys), 6-notes-and-tools.
Contains customer data and passwords: keep it on an encrypted drive, never upload or share it.
EOF

(cd "$T" && find . -type f ! -name SHA256SUMS.txt | sort | xargs -d '\n' sha256sum > SHA256SUMS.txt)
echo "full backup → $T ($(du -sh "$T" | cut -f1))"
