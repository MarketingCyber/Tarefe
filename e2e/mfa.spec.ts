import { test, expect, type Page } from "@playwright/test";
import { generate } from "otplib";

/**
 * Codifies the manual QA done when MFA shipped (2026-08-29) into a
 * repeatable test, using the dedicated mfa-test@tarefe.de fixture (see
 * e2e/README.md — never advisor@tarefe.de, to avoid racing the
 * "advisor has no MFA" assertion in auth.spec.ts). One long sequential
 * test rather than several independent ones: each step's state (the TOTP
 * secret, the enabled/disabled flag) is exactly what the next step needs,
 * and splitting it up would just reintroduce the race this file exists to
 * avoid.
 */
const ACCOUNT = { email: "mfa-test@tarefe.de", password: "Tarefe-MfaTest-2026!" };

async function login(page: Page, email: string, password: string, totpCode?: string) {
  await page.locator('input[name="email"]').fill(email);
  await page.locator('input[name="password"]').fill(password);
  await page.getByRole("button", { name: "ورود" }).click();
  if (totpCode) {
    await page.locator('input[name="totpCode"]').fill(totpCode);
    await page.getByRole("button", { name: "تأیید" }).click();
  }
}

test("staff MFA: setup, enforced login, wrong/right code, disable", async ({ page }) => {
  // --- Sign in (no MFA yet) and reach the setup page ---
  await page.goto("/fa/login?callbackUrl=/ops/security");
  await login(page, ACCOUNT.email, ACCOUNT.password);
  // Exact pathname, not a loose regex over the full URL: the login page's
  // OWN address (`/fa/login?callbackUrl=/ops/security`) already contains
  // "/ops/security" as a query-string substring, so a `/\/ops\/security/`
  // regex would resolve true before signIn() ever ran — see e2e/helpers.ts.
  await page.waitForURL((url) => url.pathname === "/ops/security", { timeout: 10_000 });

  // If a previous run crashed mid-test and left setup half-done, cancel it
  // first so this run starts from a known "not set up" state.
  const cancelButton = page.getByRole("button", { name: "لغو راه‌اندازی" });
  if (await cancelButton.isVisible().catch(() => false)) {
    await cancelButton.click();
    await expect(page.getByRole("button", { name: "راه‌اندازی احراز هویت دومرحله‌ای" })).toBeVisible();
  }

  // --- Start setup, confirm with a real computed TOTP code ---
  await page.getByRole("button", { name: "راه‌اندازی احراز هویت دومرحله‌ای" }).click();
  const secret = await page.getByTestId("mfa-secret").innerText();

  await page.locator('input[name="code"]').fill(await generate({ secret }));
  await page.getByRole("button", { name: "تایید و فعال‌سازی" }).click();
  await expect(page.getByText("احراز هویت دومرحله‌ای فعال است")).toBeVisible({ timeout: 10_000 });

  // --- Sign out, log back in: password alone must now stop at the TOTP step ---
  await page.getByRole("button", { name: "خروج" }).click();
  // Confirm the session actually cleared (not just a client-side redirect
  // while still authenticated) — otherwise the next goto to /login would
  // silently bounce straight back into /ops without ever exercising a
  // fresh login, and every assertion below would pass for the wrong reason.
  await expect(page).not.toHaveURL(/\/ops/, { timeout: 10_000 });

  await page.goto("/fa/login?callbackUrl=/ops/security");
  await page.locator('input[name="email"]').fill(ACCOUNT.email);
  await page.locator('input[name="password"]').fill(ACCOUNT.password);
  await page.getByRole("button", { name: "ورود" }).click();
  await expect(page.getByText("تأیید دو مرحله‌ای")).toBeVisible({ timeout: 10_000 });

  // --- Wrong code: rejected, stays on the TOTP step ---
  await page.locator('input[name="totpCode"]').fill("000000");
  await page.getByRole("button", { name: "تأیید" }).click();
  await expect(page.getByText("کد وارد شده درست نیست")).toBeVisible({ timeout: 10_000 });

  // --- Correct code: succeeds, lands on the original callbackUrl ---
  await page.locator('input[name="totpCode"]').fill(await generate({ secret }));
  await page.getByRole("button", { name: "تأیید" }).click();
  await page.waitForURL((url) => url.pathname === "/ops/security", { timeout: 10_000 });
  await expect(page.getByText("احراز هویت دومرحله‌ای فعال است")).toBeVisible();

  // --- Cleanup: disable MFA so this fixture starts clean next run ---
  await page.locator('input[name="code"]').fill(await generate({ secret }));
  await page.getByRole("button", { name: "غیرفعال‌سازی احراز هویت دومرحله‌ای" }).click();
  await expect(page.getByText("احراز هویت دومرحله‌ای فعال نیست")).toBeVisible({ timeout: 10_000 });
});
