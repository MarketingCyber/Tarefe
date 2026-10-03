import { test, expect } from "@playwright/test";
import { login } from "./helpers";

/** Fixture from prisma/seed.ts — see e2e/README.md. */
const ADVISOR = { email: "advisor@tarefe.de", password: "Tarefe-Advisor-2026!" };

/**
 * Phase 9's second CMS content type, end to end: unlike faq-cms.spec.ts,
 * this one also proves the homepage's fallback behavior — the "coming
 * soon" note must return once the only published testimonial is removed
 * again, not leave a stale/empty section. Full round trip, no test debt.
 */
test("create a testimonial, verify it replaces the homepage placeholder, then remove it and confirm the placeholder returns", async ({ page }) => {
  const customerName = `E2E Test Customer ${Date.now()}`;
  const quote = "E2E Test quote — Playwright coverage for the Testimonials CMS.";

  // --- Homepage shows the honest placeholder before any testimonial exists ---
  await page.goto("/fa");
  await expect(page.getByText("به‌محض این‌که مشتریان واقعی نظر خود را با ما در میان بگذارند")).toBeVisible();

  // --- Create ---
  await page.goto("/fa/login?callbackUrl=/ops/testimonials");
  await login(page, ADVISOR.email, ADVISOR.password, "/ops/testimonials");
  // Two matches when the list is empty: the header button and
  // EmptyState's own CTA (same label, same destination) — either works.
  await page.getByRole("link", { name: "+ افزودن نظر" }).first().click();
  await page.locator("#customerName").fill(customerName);
  await page.locator("#quoteFa").fill(quote);
  await page.getByRole("button", { name: "ایجاد" }).click();
  await expect(page).toHaveURL(/\/ops\/testimonials$/, { timeout: 10_000 });
  await expect(page.getByText(customerName)).toBeVisible();
  // No consent note was entered — the admin list should flag that, not hide it.
  await expect(page.getByText("یادداشت رضایت ثبت نشده")).toBeVisible();

  // --- Homepage now shows the real testimonial instead of the placeholder ---
  await page.goto("/fa");
  await expect(page.getByText(quote)).toBeVisible({ timeout: 10_000 });
  await expect(page.getByText("به‌محض این‌که مشتریان واقعی نظر خود را با ما در میان بگذارند")).toBeHidden();

  // --- Delete, and confirm the honest placeholder comes back ---
  await page.goto("/ops/testimonials");
  const row = page.locator("div.rounded-xl.border.border-border.bg-white.p-4", { has: page.getByText(customerName, { exact: true }) });
  page.once("dialog", (d) => d.accept());
  await row.getByRole("button", { name: "حذف" }).click();
  await expect(page.getByText(customerName)).toBeHidden({ timeout: 10_000 });

  await page.goto("/fa");
  await expect(page.getByText("به‌محض این‌که مشتریان واقعی نظر خود را با ما در میان بگذارند")).toBeVisible({ timeout: 10_000 });
});
