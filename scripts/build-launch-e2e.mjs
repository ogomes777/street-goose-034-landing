// Rebuild for mobile Playwright with a local-only GA4 stub switch.
// Production builds never set VITE_SG034_GA4_E2E, so tracking is disabled
// on localhost/previews even when analytics consent is accepted.
import { spawnSync } from "node:child_process";

const result = spawnSync(process.platform === "win32" ? "npm.cmd" : "npm", ["run", "build"], {
  env: { ...process.env, VITE_SG034_GA4_E2E: "enabled" },
  stdio: "inherit",
  shell: process.platform === "win32",
});
if (result.error) {
  console.error("Failed to prepare Playwright E2E build:", result.error.message);
  process.exit(1);
}
process.exit(result.status ?? 1);
