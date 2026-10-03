import { test, expect } from "@playwright/test";
import { login } from "./helpers";

/** Fixtures from prisma/seed.ts — see e2e/README.md. */
const ADVISOR = { email: "advisor@tarefe.de", password: "Tarefe-Advisor-2026!", name: "آرش شریفی" };
const CUSTOMER_NAME = "پوریا حسینی"; // customer@tarefe.de's seeded name
// Unique per run (same pattern as tasks.spec.ts's title) — a retry that
// fails after the "Start application" click but before the test finishes
// still leaves a real row behind (there's no delete path to clean up on
// retry), and a fixed name across retries made a later run's "find the one
// I just created" locator ambiguous against earlier runs' leftovers. This
// found that bug the hard way once already — see e2e/README.md.
const PROVIDER = `Playwright E2E Test Provider ${Date.now()}`;
const TARIFF = "E2E Test Tariff";

/**
 * Covers the full application lifecycle: start one from a customer's
 * profile, confirm it on the customer page and its own detail page, move
 * it to APPROVED, and confirm that auto-creates the linked Contract (the
 * one behavior in src/lib/application-actions.ts genuinely worth an
 * automated regression test — the Contract.customerId requirement makes
 * a bug here silently un-notice-able without one).
 *
 * Leaves one real Application + one real Contract with no UI delete path,
 * same accepted test debt as consultation.spec.ts's Lead and gdpr.spec.ts's
 * deletion-request ServiceRequest — tagged with an obvious "Playwright E2E
 * Test" provider name, see e2e/README.md.
 */
test("starting an application from a customer profile, then approving it, creates a contract", async ({ page }) => {
  await page.goto("/fa/login?callbackUrl=/ops/customers");
  await login(page, ADVISOR.email, ADVISOR.password, "/ops/customers");

  await page.getByRole("link", { name: CUSTOMER_NAME }).click();
  await expect(page.getByRole("heading", { name: CUSTOMER_NAME, level: 1 })).toBeVisible({ timeout: 10_000 });

  await page.locator('input[name="provider"]').fill(PROVIDER);
  await page.locator('input[name="tariffName"]').fill(TARIFF);
  await page.locator('input[name="category"]').fill("insurance");
  await page.getByRole("button", { name: "شروع درخواست" }).click();

  const applicationLink = page.getByRole("link", { name: `${PROVIDER} — ${TARIFF}` });
  await expect(applicationLink).toBeVisible({ timeout: 10_000 });
  await applicationLink.click();

  await expect(page.getByRole("heading", { name: `${PROVIDER} — ${TARIFF}`, level: 1 })).toBeVisible({ timeout: 10_000 });
  // Scoped to the Details panel's <dd> — the advisor's name legitimately
  // also appears in the sidebar footer, the activity log entry, and its
  // timestamp line, so an unscoped text match is ambiguous under strict mode.
  await expect(page.getByRole("definition").filter({ hasText: ADVISOR.name })).toBeVisible();
  // Scoped to the status Badge's own span, not a loose text match — the
  // status <select> also has a matching <option>, which would otherwise
  // make this ambiguous under Playwright's strict mode.
  await expect(page.locator("span.rounded-full", { hasText: "ارسال‌شده" })).toBeVisible({ timeout: 10_000 });

  await page.locator('select[name="status"]').selectOption("APPROVED");
  await page.getByRole("button", { name: "به‌روزرسانی وضعیت" }).click();

  await expect(page.getByText("تایید شد — قرارداد ساخته شد.")).toBeVisible({ timeout: 10_000 });

  await page.goto("/ops/customers");
  await page.getByRole("link", { name: CUSTOMER_NAME }).click();
  await expect(page.getByRole("heading", { name: CUSTOMER_NAME, level: 1 })).toBeVisible({ timeout: 10_000 });

  // Two occurrences now: the Applications list row (still there, APPROVED)
  // and the new Contracts row created by the approval. .count() rather
  // than toBeVisible() deliberately, since strict mode rejects a locator
  // matching more than one element — see e2e/README.md's note on loose
  // selectors for why an ambiguous match here would be worse than useless.
  await expect(async () => {
    expect(await page.getByText(`${PROVIDER} — ${TARIFF}`).count()).toBe(2);
  }).toPass({ timeout: 10_000 });
});
