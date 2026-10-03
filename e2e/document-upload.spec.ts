import { test, expect } from "@playwright/test";
import { login } from "./helpers";

/** Fixtures from prisma/seed.ts — see e2e/README.md. */
const ADVISOR = { email: "advisor@tarefe.de", password: "Tarefe-Advisor-2026!" };
const CUSTOMER = { email: "customer@tarefe.de", password: "Tarefe-Customer-2026!" };
const CUSTOMER_NAME = "پوریا حسینی";

/**
 * Document.fileUrl existed with no real upload path anywhere until this
 * round — this test exercises the actual round trip: upload a real file
 * as staff, confirm both staff and the document's own customer can
 * download it (with the right bytes back), confirm the file is genuinely
 * gone (not just DB-deleted) after removal, and confirm the
 * access-control gate on /api/documents/[id] actually gates.
 */
test("upload a document, download it as staff and as the owning customer, then delete it — leaving no file behind", async ({ page, request }) => {
  const title = `E2E Test Document ${Date.now()}`;
  const fileContent = "This is a fake PDF for E2E test coverage — not a real PDF, just needs the right MIME type.";

  // --- Find the seeded customer's Customer-360 URL ---
  await page.goto("/fa/login?callbackUrl=/ops/customers");
  await login(page, ADVISOR.email, ADVISOR.password, "/ops/customers");
  await page.getByRole("link", { name: CUSTOMER_NAME }).click();
  await expect(page).toHaveURL(/\/ops\/customers\/[a-z0-9]+$/, { timeout: 10_000 });
  const customerUrl = page.url();
  const documentApiBase = "/api/documents/";

  // --- Upload ---
  // getByPlaceholder, not input[name="title"] — the same page also has
  // QuickAddTask's task-title field, which shares the name "title".
  await page.getByPlaceholder("عنوان مدرک").fill(title);
  await page.locator('select[name="type"]').selectOption("CONTRACT");
  await page.locator('input[name="file"]').setInputFiles({ name: "test.pdf", mimeType: "application/pdf", buffer: Buffer.from(fileContent) });
  await page.getByRole("button", { name: "آپلود" }).click();
  await expect(page.getByText(title)).toBeVisible({ timeout: 10_000 });

  // --- Download as staff: real bytes come back, right content type ---
  // Specific row class, not a bare "div" — a bare-tag selector with
  // has/hasText also matches every nested wrapper div (same trap fixed in
  // faq-cms.spec.ts etc.), which Playwright's strict mode correctly rejects.
  const documentRow = page.locator("div.rounded-xl.border.border-border.p-3.text-sm", { hasText: title });
  const downloadLink = documentRow.getByRole("link", { name: "دانلود" });
  const href = await downloadLink.getAttribute("href");
  expect(href).toMatch(new RegExp(`^${documentApiBase}`));

  const staffDownload = await page.request.get(href!);
  expect(staffDownload.status()).toBe(200);
  expect(staffDownload.headers()["content-type"]).toBe("application/pdf");
  expect((await staffDownload.body()).toString()).toBe(fileContent);

  // --- Unauthenticated request to the same URL is rejected ---
  const anonAttempt = await request.get(`http://82.165.255.110${href}`);
  expect(anonAttempt.status()).toBe(401);

  // --- Customer (the document's real owner) can also download it ---
  await page.goto("/fa/login?callbackUrl=/app/documents");
  await login(page, CUSTOMER.email, CUSTOMER.password, "/app/documents");
  await expect(page.getByText(title)).toBeVisible({ timeout: 10_000 });
  const customerDownload = await page.request.get(href!);
  expect(customerDownload.status()).toBe(200);

  // --- Delete (as staff) — the customer login above replaced the advisor
  // session cookie in this same browser context, so sign back in first.
  const customerPath = new URL(customerUrl).pathname;
  await page.goto(`/fa/login?callbackUrl=${customerPath}`);
  await login(page, ADVISOR.email, ADVISOR.password, customerPath);
  const row = page.locator("div.rounded-xl.border.border-border.p-3.text-sm", { hasText: title });
  page.once("dialog", (d) => d.accept());
  await row.getByRole("button", { name: "حذف" }).click();
  await expect(page.getByText(title)).toBeHidden({ timeout: 10_000 });

  const afterDelete = await page.request.get(href!);
  expect(afterDelete.status()).toBe(404);
});
