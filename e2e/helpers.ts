import type { Page } from "@playwright/test";

/**
 * Fills email/password and submits — deliberately does NOT wait for or
 * assert the result here (see expectLoggedInAt for why).
 */
export async function fillAndSubmitLogin(page: Page, email: string, password: string) {
  await page.locator('input[name="email"]').fill(email);
  await page.locator('input[name="password"]').fill(password);
  await page.getByRole("button", { name: "ورود" }).click();
}

/**
 * Waits for a real post-login navigation to `pathname`, matched exactly —
 * NOT `expect(page).toHaveURL(/\/ops/)` or similar loose regex over the
 * full URL. That trap bit this suite for real: `/fa/login?callbackUrl=/ops`
 * — the login page's OWN url, before signIn() has done anything — already
 * contains the substring "/ops", so a `/\/ops/` regex resolves instantly
 * and true against the still-on-the-login-page state. Every assertion
 * built on that pattern was racing the actual async login instead of
 * waiting for it; page.goto() calls that immediately followed sometimes
 * fired before the session cookie was ever set, landing genuinely signed
 * out. Comparing the exact pathname (no query string involved) doesn't
 * have that ambiguity.
 */
export async function expectLoggedInAt(page: Page, pathname: string) {
  await page.waitForURL((url) => url.pathname === pathname, { timeout: 10_000 });
}

export async function login(page: Page, email: string, password: string, expectedPathname: string) {
  await fillAndSubmitLogin(page, email, password);
  await expectLoggedInAt(page, expectedPathname);
}
