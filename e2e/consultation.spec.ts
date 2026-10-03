import { test, expect } from "@playwright/test";

/**
 * This creates a real Lead row in production (see e2e/README.md — there's
 * no staging environment to isolate this from). Uses an obviously-fake,
 * consistently-tagged name so it's easy to spot and clear from /ops/leads
 * if that ever becomes worth doing.
 */
test("consultation form submits and reaches the success page", async ({ page }) => {
  await page.goto("/fa/consultation");

  await page.locator('input[name="name"]').fill("E2E Test — Playwright");
  await page.locator('input[name="email"]').fill(`e2e-test-${Date.now()}@example.com`);
  await page.locator('input[name="phone"]').fill("+491701234567");

  await page.getByRole("button", { name: "ارسال درخواست" }).click();

  await expect(page).toHaveURL(/\/consultation\/success/, { timeout: 10_000 });
});
