import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/launch",
  fullyParallel: false,
  retries: 1,
  timeout: 45_000,
  reporter: "line",
  use: {
    baseURL: "http://127.0.0.1:4174",
    colorScheme: "dark",
  },
  // Perfis de dispositivos simulados: Chromium/Android e WebKit/iPhone.
  // O segundo executa o motor Safari em Linux, não um iPhone físico.
  projects: [
    { name: "android-chromium", use: { ...devices["Pixel 7"] } },
    { name: "iphone-webkit", use: { ...devices["iPhone 13"] } },
  ],
  webServer: {
    command: "npm run preview -- --host 127.0.0.1 --port 4174 --strictPort",
    url: "http://127.0.0.1:4174",
    reuseExistingServer: false,
    timeout: 120_000,
  },
});
