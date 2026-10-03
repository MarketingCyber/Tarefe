import { test, expect } from "@playwright/test";
import { login } from "./helpers";

/** Fixture from prisma/seed.ts — see e2e/README.md. */
const ADVISOR = { email: "advisor@tarefe.de", password: "Tarefe-Advisor-2026!" };

/**
 * Phase 9's third CMS content type, end to end. Also exercises the
 * heading/paragraph body-parsing convention (src/lib/guide-body.ts) with
 * a real two-section body, since that's the one piece of this feature
 * that's genuinely easy to get subtly wrong (unlike FAQ/Testimonial,
 * which have no parsing step between the form and the DB).
 */
test("create a guide with a multi-section body, verify it renders correctly on /guides and its own page, then delete it", async ({ page }) => {
  const slug = `e2e-test-guide-${Date.now()}`;
  const title = `E2E Test Guide ${Date.now()}`;
  const excerpt = "E2E Test excerpt for Playwright coverage.";
  const heading1 = "First section heading";
  const paragraph1 = "First paragraph of the first section.";
  const heading2 = "Second section heading";
  const paragraph2a = "First paragraph of the second section.";
  const paragraph2b = "Second paragraph of the same section.";
  const body = `## ${heading1}\n\n${paragraph1}\n\n## ${heading2}\n\n${paragraph2a}\n\n${paragraph2b}`;

  await page.goto("/fa/login?callbackUrl=/ops/guides");
  await login(page, ADVISOR.email, ADVISOR.password, "/ops/guides");
  await page.getByRole("link", { name: "+ افزودن راهنما" }).first().click();

  await page.locator("#slug").fill(slug);
  await page.locator("#titleFa").fill(title);
  await page.locator("#excerptFa").fill(excerpt);
  await page.locator("#bodyFa").fill(body);
  await page.getByRole("button", { name: "ایجاد" }).click();
  await expect(page).toHaveURL(/\/ops\/guides$/, { timeout: 10_000 });
  await expect(page.getByText(title)).toBeVisible();

  // --- /guides index shows it ---
  await page.goto("/fa/guides");
  await expect(page.getByText(title)).toBeVisible({ timeout: 10_000 });
  await expect(page.getByText(excerpt)).toBeVisible();

  // --- The guide's own page correctly parsed both sections ---
  await page.goto(`/fa/guides/${slug}`);
  await expect(page.getByRole("heading", { name: heading1 })).toBeVisible({ timeout: 10_000 });
  await expect(page.getByText(paragraph1)).toBeVisible();
  await expect(page.getByRole("heading", { name: heading2 })).toBeVisible();
  await expect(page.getByText(paragraph2a)).toBeVisible();
  await expect(page.getByText(paragraph2b)).toBeVisible();

  // --- Delete, leaving no trace ---
  await page.goto("/ops/guides");
  const row = page.locator("div.rounded-xl.border.border-border.bg-white.p-4", { has: page.getByText(title, { exact: true }) });
  page.once("dialog", (d) => d.accept());
  await row.getByRole("button", { name: "حذف" }).click();
  await expect(page.getByText(title)).toBeHidden({ timeout: 10_000 });

  await page.goto(`/fa/guides/${slug}`);
  await expect(page.getByText("404").or(page.getByText("این صفحه پیدا نشد"))).toBeVisible({ timeout: 10_000 });
});
