import { test, expect } from "@playwright/test";
import { login } from "./helpers";

/** Fixture from prisma/seed.ts — see e2e/README.md. */
const ADVISOR = { email: "advisor@tarefe.de", password: "Tarefe-Advisor-2026!" };

/**
 * Covers Task (Phase 8.4): create a free-standing task on /ops/tasks, mark
 * it done, reopen it, and confirm it also surfaces on /ops/my-work — the
 * two places TaskList/QuickAddTask are used org-wide vs. per-advisor.
 * Self-cleans via psql-free means isn't possible here (no UI delete path,
 * matching the same accepted-debt pattern as Lead/ServiceRequest — see
 * e2e/README.md) so this uses an obviously-tagged title.
 */
test("create, complete, and reopen a task from /ops/tasks", async ({ page }) => {
  await page.goto("/fa/login?callbackUrl=/ops/tasks");
  await login(page, ADVISOR.email, ADVISOR.password, "/ops/tasks");

  const title = `E2E Test — Playwright task ${Date.now()}`;
  await page.locator('input[name="title"]').fill(title);
  await page.getByRole("button", { name: "افزودن" }).click();

  const taskRow = page.locator("li", { hasText: title });
  await expect(taskRow).toBeVisible({ timeout: 10_000 });

  // Mark done: it should disappear from the default "open" filter view.
  await taskRow.getByRole("button", { name: "علامت‌گذاری به‌عنوان انجام‌شده" }).click();
  await expect(taskRow).toBeHidden({ timeout: 10_000 });

  // Switch to the "Done" filter and reopen it there.
  await page.getByRole("link", { name: "انجام‌شده" }).click();
  const doneRow = page.locator("li", { hasText: title });
  await expect(doneRow).toBeVisible({ timeout: 10_000 });
  await doneRow.getByRole("button", { name: "بازگشایی مجدد" }).click();
  await expect(doneRow).toBeHidden({ timeout: 10_000 });
});

test("a task assigned to me shows up on /ops/my-work", async ({ page }) => {
  await page.goto("/fa/login?callbackUrl=/ops/my-work");
  await login(page, ADVISOR.email, ADVISOR.password, "/ops/my-work");

  const title = `E2E Test — Playwright my-work task ${Date.now()}`;
  await page.locator('input[name="title"]').fill(title);
  await page.getByRole("button", { name: "افزودن" }).click();

  const taskRow = page.locator("li", { hasText: title });
  await expect(taskRow).toBeVisible({ timeout: 10_000 });

  // Clean up within the test itself, since /ops/my-work only has the
  // "open" view — nothing to switch to like /ops/tasks's Done filter.
  await taskRow.getByRole("button", { name: "علامت‌گذاری به‌عنوان انجام‌شده" }).click();
  await expect(taskRow).toBeHidden({ timeout: 10_000 });
});
