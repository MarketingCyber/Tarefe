# E2E tests

Runs against the live deployed site (`http://82.165.255.110` by default —
override with `E2E_BASE_URL`). There's no staging environment for this
project, so these tests are the only thing standing between a deploy and a
regression a real visitor would hit.

```bash
npx playwright test           # run everything, headless
npx playwright test --headed  # watch it run
npx playwright test e2e/mfa.spec.ts
```

## Fixtures these tests depend on

Seeded by `prisma/seed.ts` (run `npm run seed` — or `npx tsx prisma/seed.ts`
— against the target database if these accounts don't exist yet):

| Account | Password | Role | Used by |
|---|---|---|---|
| `customer@tarefe.de` | `Tarefe-Customer-2026!` | CUSTOMER | auth.spec.ts |
| `advisor@tarefe.de` | `Tarefe-Advisor-2026!` | ADVISOR, **no MFA** | auth.spec.ts (asserts plain login still works) |
| `mfa-test@tarefe.de` | `Tarefe-MfaTest-2026!` | ADVISOR, dedicated to MFA tests | mfa.spec.ts |

`mfa-test@tarefe.de` is separate from `advisor@tarefe.de` on purpose: the
MFA suite enables and disables MFA on its account as part of the test, and
sharing an account with the "advisor logs in with no MFA" baseline test
would make the two suites race each other.

## Self-cleanup

Every test that mutates state undoes it by the end of the test (MFA is
disabled again, no leads are asserted to persist). Two tests create rows
with no UI path to remove them afterward — both tagged with an obvious
"E2E test" / "Playwright" name so they're easy to spot and clear manually
if they bother you enough to warrant adding a cleanup path:

- `consultation.spec.ts` — a real `Lead` row, every run.
- `gdpr.spec.ts`'s deletion-request test — a real `ServiceRequest`
  (`subjectType: "account_deletion"`) on the shared `customer@tarefe.de`
  fixture, every run. Deliberately doesn't actually delete the account —
  see `src/app/app/profile/page.tsx`'s comment on why deletion is
  staff-reviewed, not instant.
- `applications.spec.ts` — a real `Application` (approved) and the
  `Contract` its approval auto-creates, both on `customer@tarefe.de`,
  every run. Neither has a delete path in the app at all (same as
  contracts generally — see the Phase-8.7 note below). The provider name
  includes `Date.now()` (like `tasks.spec.ts`'s task title) rather than a
  fixed string — found the hard way, mid-session, that a fixed name broke
  under retries: a run that fails *after* the "Start application" click
  but before the test finishes still leaves a real row (no delete path to
  undo it on retry), and a fixed name made a later run's "find the one I
  just created" locator ambiguous against an earlier run's leftover.
- `leads-detail.spec.ts` — a real `Lead` row, every run, created directly
  via `POST /api/leads` (the same endpoint the public consultation form
  submits to) rather than driving that form again — this test's job is
  `/ops/leads/[id]`, not lead capture, which `consultation.spec.ts`
  already covers. No delete path exists for leads at all.

That's a known, accepted cost of not having a staging environment.

## Login rate limiting has no automated test, deliberately (2026-08-31)

`src/lib/auth.ts`'s `authorize()` now rate-limits per IP (see its own
comment for the current number — login had zero brute-force protection
before this, unlike `/api/leads`/`/api/events`, which is what surfaced the
gap). There's no `login-rate-limit.spec.ts` and there shouldn't be one:
this whole suite runs from one machine against one live server, so every
spec that logs in shares the same source IP and the same 60-second
sliding window. A test that deliberately trips the limiter would poison
that window for every other spec's login for the next minute.

**This actually happened three times while building this feature — all
real, useful signal, not just an inconvenience to route around:**
1. Manually verifying the limiter by hand (12 rapid wrong-password submits
   through the real rendered login form) correctly tripped it, but left
   the shared IP's window poisoned — the very next `auth.spec.ts`/
   `mfa.spec.ts` run failed until the 60s window cleared.
2. The **first threshold chosen (10/minute) was too tight for real
   fault**: a full parallel run of this suite legitimately fires well over
   10 `authorize()` calls from one IP within seconds (`grep -c "await
   login("` across every spec totals 18, and that undercounts real
   traffic — `mfa.spec.ts` does a full round trip beyond its one `login()`
   call, `document-upload.spec.ts` signs in three separate times as
   staff/customer/staff again) — got correctly rejected as "too many
   attempts," a genuine full-suite run, not an edge case.
3. **30/minute still wasn't enough** — two consecutive full-suite runs
   both failed the exact same 4 specs every time (`page.waitForURL`
   timeouts — login silently not completing is exactly what a rejected
   `authorize()` call looks like from the test's side), reproducibly, not
   flakily. Landed on 60/minute with real headroom above the suite's
   actual measured demand. See `src/lib/auth.ts`'s comment for why the
   precise number matters far less than a limit existing at all.

Re-verify by hand the same way if this logic changes — wait out the
window between checks, and don't add an automated spec for it; one will
flake every other login-dependent test in the suite once a minute.

**Same reasoning, a second endpoint (2026-08-31):** `/ops/security`'s
`confirmSetup`/`disableMfa` actions verify a TOTP code too and had no
throttle at all — a 6-digit code is brute-forceable within its own valid
window by sheer request volume with nothing slowing it down. Rate-limited
the same way (`mfa-verify:<ip>`, 10/minute — tighter than login's 60,
since nothing here is stressed by a parallel suite run the way login is;
only `mfa.spec.ts` touches it, a handful of calls). Verified by hand the
same way: 12 rapid wrong-code submits through the real rendered form on
`mfa-test@tarefe.de` correctly showed the rate-limit message on the 11th,
then cancelled the setup and confirmed via direct DB query
(`mfaEnabled=false`, `mfaSecret` null) that the fixture was left clean
before moving on — a poisoned window on this endpoint doesn't cross-affect
login the way login's own window would, but leaving the shared fixture
account mid-setup would have broken the next `mfa.spec.ts` run regardless.

## What's covered vs. not (as of 2026-08-30)

Covered: public smoke (homepage/locale/login/protected-route redirects),
cookie consent, core auth (customer/advisor login, wrong password), the
full MFA lifecycle, lead capture, two of the seven qualification-wizard
configs (one PLP-embedded collapsed-subcategory flow, one productType PDP
flow — the engine is shared, so this exercises both call sites without
hard-coding all seven configs' wording), ops/CRM page-level smoke (every
`/ops/*` page renders its heading for an advisor; a customer is redirected
away), GDPR export/deletion, Task create/complete/reopen, Customer 360,
document upload/download/access-control/delete, the full CRUD +
public-page-reflects-it lifecycle for all three CMS content types (FAQ,
Testimonials, Guides), the application lifecycle (start → approve →
contract auto-created), and the lead detail page (assign-to-me, status
update, notes — `leads-detail.spec.ts`).

Not covered: the comparison tray/table, search, the remaining five
qualification configs individually.

Two features depend on data that can't be created through any UI action
that also sets the specific field the logic keys off (a `Contract` can now
be created via an approved `Application` — see `applications.spec.ts` —
but that flow can't set `cancellationDeadline` to a specific test date; a
ticket message needs a real elapsed-time gap no test can fast-forward) —
both verified manually via psql-inserted fixtures instead, not by an
automated test, and documented here so "not in the suite" doesn't get
mistaken for "not tested":

- **`/ops/contracts`'s cancellation-deadline bucketing** (Overdue/Today/
  This week/This month/Upcoming) — inserted two real rows (one 3 days
  overdue, one due in 2 days), confirmed both landed in the correct
  bucket against the actual date, then removed.
- **`/ops/tickets`'s SLA tracking** (`src/lib/sla.ts` — waiting-on-us
  detection + the 24h breach threshold, shown on both the list and a
  ticket's own page, and the `ticket_sla_breach` notification rule in
  `scripts/run-notification-rules.ts`) — inserted a ticket with a
  customer message backdated 28h, confirmed the badge showed "28h
  waiting" in the danger color on both pages (via a real screenshot, not
  just text extraction — see below), ran the notification script twice
  and confirmed it created exactly one correctly-addressed notification
  then correctly deduped on the second run, then removed everything.

If either of these change, re-verify the same way (real inserted fixtures
+ direct DB/visual checks) rather than trusting the existing heading-smoke
coverage to catch a math regression — it only catches "the page crashed",
not "the bucket/threshold logic is now wrong".

## A tooling note, not an app bug (2026-08-30)

While manually verifying the SLA feature above, the Browser pane's
`get_page_text`/`document.body.innerText` extraction returned an
incomplete/stale result (just the nav shell) for `/ops/tickets/[id]` on
several attempts in a row, including after a hard reload — while a direct
`fetch(location.href)` from the same page confirmed the server's raw HTML
response was completely correct, and a `computer{screenshot}` of the same
moment showed the page rendering perfectly (SLA badge and all). This adds
to the same "screenshots and text-extraction can lag or return stale
results; direct DOM/JS checks and screenshots together are the reliable
signal" pattern already noted elsewhere in this project's history — when
a page "looks broken" only through `get_page_text`, take a screenshot (or
check `document.body.innerText` via `javascript_tool` directly) before
concluding there's a real bug.

## Another tooling note: Playwright's `request` fixture caches (2026-08-31)

`gdpr.spec.ts`'s "export endpoint rejects an unauthenticated request" test
started failing (401 expected, got a real 200 with another user's actual
export data) in a way that looked exactly like a serious cross-user
caching vulnerability in `/api/account/export` — and it was treated as
exactly that serious until proven otherwise, not waved off as "probably a
flake." Investigated properly: `page.request`/the bare `request` fixture
in Playwright use an HTTP client that respects standard heuristic caching
(RFC 7234) — a response with a `Last-Modified` header but no explicit
`Cache-Control` is fair game for a compliant client to cache and replay,
keyed on the bare URL, for a subsequent request from a *different*
Playwright fixture instance (even a supposedly-fresh unauthenticated
`request` context) within the same run. Plain `curl` — not a caching
client at all — got a correct, fresh 401 at every single point in this
investigation, including immediately after an authenticated Playwright hit
and after a full `rm -rf .next` + rebuild on the server; a cache-busting
query string on the Playwright side also immediately fixed it. That
combination proves the client cached it, not the server — the app was
never actually leaking data to a real unauthenticated visitor.

Fixed anyway, and correctly so: `/api/account/export` had no explicit
`Cache-Control`, which is exactly the gap that let a compliant caching
client (Playwright's, and in principle any real one — a corporate proxy,
a misconfigured CDN, a future browser) legitimately cache a page of raw
PII. Added `export const dynamic = "force-dynamic"` and
`Cache-Control: private, no-store` — matching `/api/documents/[id]`, which
already had this and was never affected the same way for exactly that
reason. **The lesson for next time a Playwright API test returns
authenticated-looking data with no cookies sent: check whether the route
sends `Last-Modified` without `Cache-Control`, and cache-bust with a query
string to isolate client-side caching before concluding it's a server
bug** — but treat it as a real bug until that check clears it, the way
this one was, not dismiss it early because a quick guess says "flake."
