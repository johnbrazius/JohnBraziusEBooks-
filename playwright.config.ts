import { defineConfig, devices } from "@playwright/test";

/**
 * End-to-end tests run against a production build with the MOCK payment provider (no real money).
 * Prerequisites: a seeded database in DATABASE_URL and `npm run build`. Set E2E_ADMIN_EMAIL / E2E_ADMIN_PASSWORD
 * to an admin created with `npm run admin:create`.
 */
export default defineConfig({
  testDir: "tests/e2e",
  timeout: 90_000,
  fullyParallel: false,
  workers: 1,
  use: { baseURL: "http://localhost:3100", trace: "retain-on-failure" },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: "npx next start -p 3100",
    url: "http://localhost:3100",
    reuseExistingServer: false,
    timeout: 120_000,
    env: { PAYMENT_PROVIDER: "mock", ALLOW_MOCK_PAYMENTS: "true", STORAGE_DRIVER: "local", NEXT_PUBLIC_SITE_URL: "http://localhost:3100" },
  },
});
