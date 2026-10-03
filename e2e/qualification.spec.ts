import { test, expect, type Page } from "@playwright/test";

/**
 * QualificationWizard (src/components/forms/QualificationWizard.tsx) is
 * one shared engine driving 7 different configs — walking it generically
 * (always pick the first radio option, advance, repeat) covers the engine
 * itself without hard-coding every config's exact question wording, which
 * would make this test break on every copy edit instead of only on real
 * behavioral regressions. Two representative routes: one collapsed
 * subcategory (energy/electricity, embedded in the PLP) and one
 * productType-level PDP (insurance/health/pkv) — the two different call
 * sites in the codebase (PlpView vs PDP), not every one of the 7 configs.
 */
async function walkWizardToOutcome(page: Page) {
  const wizard = page.locator("div.rounded-2xl.border.border-border.bg-white").filter({ has: page.getByRole("radiogroup") }).first();
  await expect(wizard).toBeVisible({ timeout: 10_000 });

  // "شروع دوباره" (start over) only renders in the done+outcome state —
  // its appearance is the generic, config-independent signal the wizard
  // finished, regardless of which service or how many steps it has.
  const restartButton = page.getByRole("button", { name: "شروع دوباره" });

  for (let guard = 0; guard < 10 && !(await restartButton.isVisible().catch(() => false)); guard++) {
    const firstOption = wizard.getByRole("radio").first();
    if (await firstOption.isVisible().catch(() => false)) {
      await firstOption.click();
    }
    const advanceButton = wizard.getByRole("button", { name: /بعدی|مشاهده نتیجه/ });
    await advanceButton.click();
    await page.waitForTimeout(250); // step-entry animation (see the component's own comment on why it only animates entry, not exit)
  }

  await expect(restartButton).toBeVisible({ timeout: 5_000 });
}

test("electricity qualification wizard (collapsed subcategory, PLP-embedded) reaches an outcome", async ({ page }) => {
  await page.goto("/fa/services/energy/electricity");
  await walkWizardToOutcome(page);
});

test("PKV qualification wizard (productType-level PDP) reaches an outcome", async ({ page }) => {
  await page.goto("/fa/services/insurance/health/pkv");
  await walkWizardToOutcome(page);
});
