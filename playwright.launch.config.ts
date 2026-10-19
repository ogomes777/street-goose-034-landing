import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/launch",
  fullyParallel: false,
  retries: 1,
  timeout: 45_000,
  reporter: "line",
  use: {
    baseURL: "http://127.0.0.1:4174",
    browserName: "chromium",
    colorScheme: "dark",
  },
  webServer: {
    command: "npm run preview -- --host 127.0.0.1 --port 4174 --strictPort",
    url: "http://127.0.0.1:4174",
    reuseExistingServer: false,
    timeout: 120_000,
  },
});
