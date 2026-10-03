import { test, expect } from "@playwright/test";
import { login } from "./helpers";

/** Fixture from prisma/seed.ts — see e2e/README.md. */
const ADVISOR = { email: "advisor@tarefe.de", password: "Tarefe-Advisor-2026!" };

/**
 * Phase 9's first CMS content type, end to end: create a FAQ item in
 * /ops/faq, confirm it actually shows up on the public /faq page (proving
 * the DB round-trip, not just that the admin form submits), unpublish it
 * and confirm it disappears from public, then delete it — leaving no
 * trace, unlike consultation.spec.ts/gdpr.spec.ts's accepted test debt
 * (this one has a real delete action, so there's no reason to leave
 * anything behind).
 */
test("create, publish-verify, unpublish-verify, and delete a FAQ item", async ({ page }) => {
  const question = `E2E Test FAQ question ${Date.now()}`;
  const answer = "E2E Test FAQ answer — Playwright coverage for the FAQ CMS.";

  await page.goto("/fa/login?callbackUrl=/ops/faq");
  await login(page, ADVISOR.email, ADVISOR.password, "/ops/faq");

  // --- Create (published by default) ---
  await page.getByRole("link", { name: "+ افزودن سوال" }).click();
  await page.locator("#questionFa").fill(question);
  await page.locator("#answerFa").fill(answer);
  await page.getByRole("button", { name: "ایجاد" }).click();
  await expect(page).toHaveURL(/\/ops\/faq$/, { timeout: 10_000 });
  await expect(page.getByText(question)).toBeVisible();

  // --- Verify it actually reached the public /faq page ---
  await page.goto("/fa/faq");
  await expect(page.getByText(question)).toBeVisible({ timeout: 10_000 });

  // --- Unpublish, verify it disappears from public ---
  await page.goto("/ops/faq");
  // The specific row-container class, not a bare "div" — a bare tag
  // selector with `has:` also matches every nested wrapper div inside the
  // row, which Playwright's strict mode correctly rejects as ambiguous.
  const row = page.locator("div.rounded-xl.border.border-border.bg-white.p-4", { has: page.getByText(question, { exact: true }) });
  await row.getByRole("button", { name: "لغو انتشار" }).click();
  await expect(row.getByRole("button", { name: "انتشار" })).toBeVisible({ timeout: 10_000 });

  await page.goto("/fa/faq");
  await expect(page.getByText(question)).toBeHidden();

  // --- Delete, leaving no trace ---
  await page.goto("/ops/faq");
  const rowAgain = page.locator("div.rounded-xl.border.border-border.bg-white.p-4", { has: page.getByText(question, { exact: true }) });
  page.once("dialog", (d) => d.accept());
  await rowAgain.getByRole("button", { name: "حذف" }).click();
  await expect(page.getByText(question)).toBeHidden({ timeout: 10_000 });
});
