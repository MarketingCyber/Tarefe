import { defineConfig, devices } from "@playwright/test";

/**
 * E2E config. There is no local dev/staging environment for this project
 * (see AGENTS.md / project history — local .env's DATABASE_URL is a bare
 * placeholder; every real check this project has ever done runs against
 * the deployed VPS). E2E_BASE_URL lets that change later if a staging
 * environment ever exists; until then this deliberately targets
 * production, and every test that creates state (leads, MFA enrollment)
 * is responsible for cleaning up after itself — see e2e/README.md.
 */
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 2 : undefined,
  reporter: [["list"]],
  timeout: 30_000,
  use: {
    baseURL: process.env.E2E_BASE_URL || "http://82.165.255.110",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});
