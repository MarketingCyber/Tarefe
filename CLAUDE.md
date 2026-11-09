@AGENTS.md

# Project status and local backup (owner's rule, 2026-11-09)

`PROJECT-STATUS.md` explains, in every detail, what is built, what is being built and what is planned. After every
change to the project (code, server, settings, data, decisions):
1. Update the affected sections of `PROJECT-STATUS.md`, its "Last updated" date, and add a changelog line
   (date, change, deployed or not). Commit it with the change.
2. Refresh the local copy: `bash scripts/local-backup.sh` (quick: code, status file, notes);
   after a deploy or a data change: `bash scripts/local-backup.sh --full` (adds the live database, uploads, server setup).
