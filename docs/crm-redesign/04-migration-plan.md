# New CRM — parallel run and migration plan (owner's plan, 2026-10-30)

Owner's decision: run **both CRMs in parallel, synced with each other**, give operators time to work in the new one,
QA/QC it against the old one, then migrate fully. Nothing is dropped: every field, label, stage, status and automation
of the old CRM has a counterpart, so operators recognise everything.

## The one rule that makes two-way sync safe
At any moment, each kind of record has exactly **one system of record**. The other side is a live mirror that can
still be edited, but its edits are written to the system of record *first* and only then shown. So an operator can
work in either CRM, both always show the same data, and there are never two competing versions to merge.

| Phase | System of record | Old CRM (Dynamics) | New CRM (tarefe.de /ops) |
|---|---|---|---|
| 1. Mirror | Dynamics | works as today | read-only live copy of everything |
| 2. Parallel | Dynamics | works as today | operators can edit; each edit is written into Dynamics, whose automations run, and the result syncs back |
| 3. Shadow automations | Dynamics | automations still decide | the new CRM runs its own versions of the automations in "dry run" and we compare results daily |
| 4. Switch | **tarefe.de** | read-only (later: off) | automations live in the new CRM; Dynamics gets a copy for reference |
| 5. Retire | tarefe.de | archived export | — |

Each step is reversible until phase 5: Dynamics keeps all its data and automations the whole time.

## How the sync works
**Dynamics → tarefe.de (phases 1–3).** Dynamics already pushes every change through its "site syncer"
(`new_sitesyncer` → `TarefeSiteSyncer.SendDataToSite` → `api.tarefe.de/crm/v1/...`, 56 endpoints, see
01-old-crm-map.md). tarefe.de gets the same endpoints, so Dynamics (or the old server, forwarding) sends each change
here too. Plus a nightly **full reconciliation** over the Web API that catches anything a push missed.

**tarefe.de → Dynamics (phase 2–3).** An edit in /ops is sent to the Dynamics Web API with a dedicated service user;
only after Dynamics accepts it is it saved in tarefe.de (and the syncer's echo is recognised by record version, so it
doesn't loop).

**Phase 4 reverses the arrows**: tarefe.de becomes the master and writes a copy into Dynamics.

## QA / QC (phases 2–3)
- **Daily reconciliation report** in /ops: record counts and field-by-field differences per table (customers,
  contracts, tickets, notes, points, leads…), every mismatch listed.
- **Automation comparison**: for every old workflow, the new code's dry-run result next to what Dynamics did
  (e.g. "cancellation deadline set to 2027-03-01 — Dynamics: 2027-03-01 ✓").
- **Operator checklist** per screen: the same task done in both CRMs gives the same result.
- **Exit criteria for the switch**: 2 weeks with zero unexplained differences, every automation matched, operators
  sign off.

## What we need from the CRM team / BayatSoft
1. A dedicated Dynamics service user for tarefe.de (read + write on the CRM tables; not a person's login).
2. Their OK (and the setting) for the site syncer to also deliver to tarefe.de.
3. https for the Dynamics API (today the old server talks to it over plain http).
4. Before phase 3: the C# source or a description of the custom code (points, customer level, commission,
   letters, dates), so the new automations match exactly.

## Build order
1. Receiving endpoints for the 56 syncer routes + the matching tables in tarefe.de (all fields kept).
2. First full import from Dynamics (read-only, with the owner's login until the service user exists).
3. /ops screens that look and behave like the Dynamics forms (same fields, labels, stages).
4. Write-back to Dynamics (needs the service user).
5. Reconciliation report.
6. Automations, one by one, in dry-run mode.
