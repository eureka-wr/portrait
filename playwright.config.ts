import { defineConfig, devices } from "@playwright/test";

const externalBaseUrl = process.env.PORTRAIT_E2E_BASE_URL;
const baseURL = externalBaseUrl ?? "http://127.0.0.1:3108";

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    ...devices["Desktop Chrome"],
    baseURL,
    channel: "chrome",
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
  },
  webServer: externalBaseUrl
    ? undefined
    : {
        command:
          "pnpm exec vinext dev --port 3108 --hostname 127.0.0.1",
        url: baseURL,
        reuseExistingServer: true,
        timeout: 120_000,
      },
});
