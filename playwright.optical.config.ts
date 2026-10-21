import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/launch",
  fullyParallel: false,
  workers: 1,
  retries: 1,
  timeout: 45_000,
  reporter: "line",
  use: {
    baseURL: "http://127.0.0.1:4174",
    colorScheme: "dark",
  },
  projects: [
    { name: "iphone-webkit", use: { ...devices["iPhone 13"] } },
    { name: "android-chromium", use: { ...devices["Pixel 7"] } },
    { name: "desktop-chromium", use: { ...devices["Desktop Chrome"] } },
  ],
  webServer: {
    command: "npm run preview -- --host 127.0.0.1 --port 4174 --strictPort",
    url: "http://127.0.0.1:4174",
    reuseExistingServer: false,
    timeout: 120_000,
  },
});
