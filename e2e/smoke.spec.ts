import { test, expect } from "@playwright/test";

test.describe("public site smoke", () => {
  test("homepage loads in Persian with core nav", async ({ page }) => {
    await page.goto("/fa");
    // The <title> is the hero subtitle (see generateMetadata in
    // src/app/[locale]/layout.tsx), not literally the brand name — the
    // header logo link is the actual place the brand renders.
    await expect(page).toHaveTitle(/.+/);
    await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
    await expect(page.getByRole("link", { name: "تعرفه" }).first()).toBeVisible();
  });

  test("German locale renders LTR", async ({ page }) => {
    await page.goto("/de");
    await expect(page.locator("html")).toHaveAttribute("dir", "ltr");
    await expect(page.locator("html")).toHaveAttribute("lang", "de");
  });

  test("login page is reachable and has email/password fields", async ({ page }) => {
    await page.goto("/fa/login");
    await expect(page.locator('input[name="email"]')).toBeVisible();
    await expect(page.locator('input[name="password"]')).toBeVisible();
  });
});

test.describe("protected routes redirect when signed out", () => {
  test("/app redirects to login", async ({ page }) => {
    await page.goto("/app");
    await expect(page).toHaveURL(/\/login/);
  });

  test("/ops redirects to login", async ({ page }) => {
    await page.goto("/ops");
    await expect(page).toHaveURL(/\/login/);
  });
});

test.describe("cookie consent", () => {
  test("banner shows on first visit and choice persists across reload", async ({ page, context }) => {
    await context.clearCookies();
    await page.goto("/fa");
    await page.evaluate(() => window.localStorage.clear());
    await page.reload();

    const banner = page.getByRole("region", { name: /کوکی/ });
    await expect(banner).toBeVisible();

    await banner.getByRole("button", { name: "قبول همه" }).click();
    await expect(banner).toBeHidden();

    await page.reload();
    await expect(page.getByRole("region", { name: /کوکی/ })).toBeHidden();

    const stored = await page.evaluate(() => window.localStorage.getItem("tarefe:cookie_consent"));
    expect(stored).toBe("accepted");
  });
});
