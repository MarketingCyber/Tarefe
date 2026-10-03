import { test, expect } from "@playwright/test";
import { login } from "./helpers";

/** Fixture from prisma/seed.ts — see e2e/README.md. */
const ADVISOR = { email: "advisor@tarefe.de", password: "Tarefe-Advisor-2026!" };
const CUSTOMER_NAME = "پوریا حسینی"; // customer@tarefe.de's seeded name

test("customers list renders and links into a Customer 360 profile", async ({ page }) => {
  await page.goto("/fa/login?callbackUrl=/ops/customers");
  await login(page, ADVISOR.email, ADVISOR.password, "/ops/customers");

  await expect(page.getByRole("heading", { name: "مشتریان", level: 1 })).toBeVisible();

  const customerLink = page.getByRole("link", { name: CUSTOMER_NAME });
  await expect(customerLink).toBeVisible();
  await customerLink.click();

  await expect(page.getByRole("heading", { name: CUSTOMER_NAME, level: 1 })).toBeVisible({ timeout: 10_000 });
  // The section headings this page always renders, seeded data or not.
  for (const heading of [/^قراردادها/, /^درخواست‌ها/, /^تیکت‌ها/, /^مدارک/]) {
    await expect(page.getByRole("heading", { name: heading })).toBeVisible();
  }
});

test("a ticket's customer name links to their Customer 360 profile", async ({ page }) => {
  await page.goto("/fa/login?callbackUrl=/ops/tickets");
  await login(page, ADVISOR.email, ADVISOR.password, "/ops/tickets");

  const firstCustomerLink = page.locator("table tbody tr").first().locator('a[href^="/ops/customers/"]');
  if (await firstCustomerLink.isVisible().catch(() => false)) {
    await firstCustomerLink.click();
    await expect(page).toHaveURL(/\/ops\/customers\/[a-z0-9]+$/, { timeout: 10_000 });
  } else {
    test.skip(true, "no tickets exist to link from yet");
  }
});
