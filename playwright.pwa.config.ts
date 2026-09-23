import { defineConfig, devices } from "@playwright/test"

export default defineConfig({
  testDir: "./e2e-pwa",
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  reporter: "list",
  use: {
    baseURL: "http://127.0.0.1:3100",
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: {
    command: "./node_modules/.bin/next start -p 3100",
    url: "http://127.0.0.1:3100/offline",
    reuseExistingServer: false,
    timeout: 120_000,
  },
})
