import { defineConfig } from "@playwright/test";

const disableWebServer = process.env.PLAYWRIGHT_DISABLE_WEBSERVER === "true";

export default defineConfig({
  testDir: "tests/e2e",
  timeout: 60000,
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3100",
    headless: true,
    browserName: (process.env.PLAYWRIGHT_BROWSER_NAME as "chromium" | "firefox" | "webkit" | undefined) ?? "chromium",
    channel: process.env.PLAYWRIGHT_CHANNEL,
  },
  webServer: disableWebServer
    ? undefined
    : {
        command: process.env.PLAYWRIGHT_WEBSERVER_COMMAND ?? "pnpm dev",
        env: {
          ...process.env,
          EXECUTION_QUEUE_ENABLED: "false",
          OPENAI_API_KEY: process.env.OPENAI_API_KEY ?? "test-key",
        },
        url: `${process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3100"}/api/health`,
        timeout: 120000,
        reuseExistingServer: true,
      },
});
