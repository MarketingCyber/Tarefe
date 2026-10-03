import { test, expect } from "@playwright/test";
import { login, fillAndSubmitLogin } from "./helpers";

/** Fixtures from prisma/seed.ts — see e2e/README.md. */
const CUSTOMER = { email: "customer@tarefe.de", password: "Tarefe-Customer-2026!" };
const ADVISOR = { email: "advisor@tarefe.de", password: "Tarefe-Advisor-2026!" };

test("customer can log in and reach the portal", async ({ page }) => {
  await page.goto("/fa/login?callbackUrl=/app");
  await login(page, CUSTOMER.email, CUSTOMER.password, "/app");
});

test("advisor without MFA logs in directly, no TOTP step", async ({ page }) => {
  await page.goto("/fa/login?callbackUrl=/ops");
  // Regression guard for the exact bug fixed 2026-08-29: signIn() used to
  // serialize a missing totpCode as the literal string "undefined" (via
  // URLSearchParams), which authorize() read as truthy and rejected as an
  // invalid code — an MFA-disabled account could never log in at all.
  await login(page, ADVISOR.email, ADVISOR.password, "/ops");
});

test("wrong password is rejected with a visible error, not a silent failure", async ({ page }) => {
  await page.goto("/fa/login");
  await fillAndSubmitLogin(page, CUSTOMER.email, "definitely-wrong-password");
  await expect(page.getByRole("alert")).toBeVisible();
  // Loose on purpose: unlike a success case, staying on /login has no
  // "callbackUrl=/login" substring trap to worry about, and the alert
  // check above is what actually proves the rejection was handled, not
  // just that a redirect from a wrong password happens to not have fired.
  await expect(page).toHaveURL(/\/login/);
});
