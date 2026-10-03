import { test, expect, type Page } from "@playwright/test";
import { login } from "./helpers";

/** Fixture from prisma/seed.ts — see e2e/README.md. */
const ADVISOR = { email: "advisor@tarefe.de", password: "Tarefe-Advisor-2026!" };

/**
 * Smoke-level coverage for the internal Ops/CRM surface (Phase 8): each
 * page actually renders its heading for a signed-in advisor, rather than
 * erroring, redirecting unexpectedly, or silently showing an empty shell.
 * Not deep interaction coverage — these pages are internal, data-heavy
 * views where the real risk is "the page 500s" or "the auth gate broke,"
 * not subtle UI bugs; e2e/mfa.spec.ts and auth.spec.ts already cover the
 * auth gate itself in depth.
 */
async function loginAsAdvisor(page: Page) {
  await page.goto("/fa/login?callbackUrl=/ops");
  await login(page, ADVISOR.email, ADVISOR.password, "/ops");
}

test.describe("ops/CRM pages render for a signed-in advisor", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdvisor(page);
  });

  const pages: { path: string; heading: string }[] = [
    { path: "/ops", heading: "نمای کلی عملیات" },
    { path: "/ops/my-work", heading: "کارهای من" },
    { path: "/ops/leads", heading: "لیدها" },
    { path: "/ops/applications", heading: "درخواست‌ها" },
    { path: "/ops/contracts", heading: "قراردادها" },
    { path: "/ops/tickets", heading: "تیکت‌ها" },
    { path: "/ops/customers", heading: "مشتریان" },
    { path: "/ops/tasks", heading: "تسک‌ها" },
    { path: "/ops/analytics", heading: "آنالیتیکس" },
    { path: "/ops/faq", heading: "سوالات متداول" },
    { path: "/ops/guides", heading: "راهنماها" },
    { path: "/ops/testimonials", heading: "نظرات مشتریان" },
    { path: "/ops/security", heading: "امنیت" },
  ];

  for (const { path, heading } of pages) {
    test(`${path} renders its heading`, async ({ page }) => {
      await page.goto(path);
      await expect(page.getByRole("heading", { name: heading, level: 1 })).toBeVisible();
    });
  }
});

test("a customer account is redirected away from /ops, not shown it", async ({ page }) => {
  await page.goto("/fa/login?callbackUrl=/ops");
  // A customer signing in with callbackUrl=/ops still passes NextAuth's
  // own auth, then gets bounced by OpsLayout's own role check
  // (session.user.role !== "ADVISOR"/"ADMIN" → redirect("/app")) — land
  // on /app specifically, not just "somewhere that isn't /ops".
  await login(page, "customer@tarefe.de", "Tarefe-Customer-2026!", "/app");
});
