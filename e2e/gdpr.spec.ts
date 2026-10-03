import { test, expect } from "@playwright/test";
import { login } from "./helpers";

/** Fixture from prisma/seed.ts — see e2e/README.md. */
const CUSTOMER = { email: "customer@tarefe.de", password: "Tarefe-Customer-2026!" };

async function loginAsCustomer(page: import("@playwright/test").Page) {
  await page.goto("/fa/login?callbackUrl=/app/profile");
  await login(page, CUSTOMER.email, CUSTOMER.password, "/app/profile");
}

test("GDPR Art. 15 export returns the real account data as a downloadable JSON file", async ({ page }) => {
  await loginAsCustomer(page);

  // Direct request rather than clicking through a browser download — the
  // API contract (auth-gated, correct content type/headers, real payload
  // shape) is what this guards, not the browser's download UI.
  const res = await page.request.get("/api/account/export");
  expect(res.status()).toBe(200);
  expect(res.headers()["content-type"]).toContain("application/json");
  expect(res.headers()["content-disposition"]).toContain("attachment");

  const body = await res.json();
  expect(body.profile.email).toBe(CUSTOMER.email);
  expect(body).toHaveProperty("contracts");
  expect(body).toHaveProperty("applications");
  expect(body).toHaveProperty("serviceRequests");
});

test("export endpoint rejects an unauthenticated request", async ({ request }) => {
  const res = await request.get("/api/account/export");
  expect(res.status()).toBe(401);
});

/**
 * Creates a real ServiceRequest (subjectType "account_deletion") for the
 * shared customer@tarefe.de fixture — there's no UI path to delete it
 * afterward (deliberately: see src/app/app/profile/page.tsx's comment on
 * why deletion is staff-reviewed, not instant-self-service). Accepted the
 * same way consultation.spec.ts's Lead row is — see e2e/README.md — clear
 * it from /ops/tickets manually if it accumulates.
 */
test("account deletion request reaches staff as a real, trackable ticket", async ({ page }) => {
  await loginAsCustomer(page);

  await page.locator('textarea[name="reason"]').fill("E2E test — Playwright deletion-request coverage");
  await page.getByRole("button", { name: "ثبت درخواست حذف حساب" }).click();

  await expect(page).toHaveURL(/deletionRequested=1/, { timeout: 10_000 });
  await expect(page.getByText("درخواست تو ثبت شد")).toBeVisible();
});
