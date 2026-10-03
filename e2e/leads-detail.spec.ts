import { test, expect } from "@playwright/test";
import { login } from "./helpers";

/** Fixture from prisma/seed.ts — see e2e/README.md. */
const ADVISOR = { email: "advisor@tarefe.de", password: "Tarefe-Advisor-2026!", name: "آرش شریفی" };

/**
 * Covers `/ops/leads/[id]` — flagged as "not covered" in e2e/README.md
 * since the sidebar-nav round translated the page but nothing exercised
 * its actual behavior (status update, assign-to-me, notes) end to end.
 * Creates its own lead directly via POST /api/leads (the same endpoint
 * the public consultation form submits to — see consultation.spec.ts for
 * that flow itself) rather than driving the public form again, since this
 * test's job is the ops detail page, not lead capture.
 *
 * Leaves one real `Lead` row with no UI delete path — same accepted-debt
 * convention as consultation.spec.ts's own lead, tagged with an obvious
 * "Playwright E2E Test" name.
 */
test("a lead's detail page supports assign-to-me, status updates, and notes", async ({ page, request }) => {
  const leadName = `Playwright E2E Test Lead ${Date.now()}`;
  const createRes = await request.post("/api/leads", {
    data: { name: leadName, email: "e2e-leads-detail@example.com", phone: "+491701234567", category: "insurance", serviceSlug: "pkv" },
  });
  expect(createRes.status()).toBe(201);
  const { id: leadId } = await createRes.json();

  await page.goto("/fa/login?callbackUrl=/ops/leads");
  await login(page, ADVISOR.email, ADVISOR.password, "/ops/leads");
  await page.goto(`/ops/leads/${leadId}`);

  await expect(page.getByRole("heading", { name: leadName, level: 1 })).toBeVisible({ timeout: 10_000 });
  // Scoped to the status Badge's own span — the status <select> also has a
  // matching <option>, which would otherwise make this ambiguous.
  await expect(page.locator("span.rounded-full", { hasText: "جدید" })).toBeVisible();
  await expect(page.getByText("بدون مشاور")).toBeVisible();

  // --- Assign to me ---
  await page.getByRole("button", { name: "واگذاری به من" }).click();
  await expect(page.getByRole("button", { name: "واگذاری به من" })).toBeHidden({ timeout: 10_000 });
  // Scoped to the Assigned-advisor <dd> — the advisor's name legitimately
  // also appears in the sidebar footer and would otherwise be ambiguous.
  await expect(page.getByRole("definition").filter({ hasText: ADVISOR.name })).toBeVisible();

  // --- Update status ---
  await page.locator('select[name="status"]').selectOption("CONTACTED");
  await page.getByRole("button", { name: "به‌روزرسانی وضعیت" }).click();
  await expect(page.locator("span.rounded-full", { hasText: "تماس گرفته‌شده" })).toBeVisible({ timeout: 10_000 });

  // --- Add a note, confirm it lands in the activity timeline ---
  // Scoped to the form containing the note input — QuickAddTask's own
  // "add" button on the same page shares the exact same label ("افزودن"),
  // which would otherwise make an unscoped click ambiguous.
  const note = `E2E test note ${Date.now()}`;
  const noteForm = page.locator("form").filter({ has: page.locator('input[name="note"]') });
  await noteForm.locator('input[name="note"]').fill(note);
  await noteForm.getByRole("button", { name: "افزودن" }).click();
  await expect(page.getByText(note)).toBeVisible({ timeout: 10_000 });
});
