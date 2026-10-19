import { expect, test } from "@playwright/test";

test("Diagnóstico de bootstrap no iPhone e Android simulados", async ({ page, browserName }) => {
  const jsErrors: string[] = [];
  const consoleErrors: string[] = [];
  const failed: string[] = [];
  page.on("pageerror", (error) => jsErrors.push(error.message.slice(0, 400)));
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text().slice(0, 400));
  });
  page.on("requestfailed", (req) => {
    if (/\.js($|\?)/.test(req.url())) failed.push(req.url().slice(0, 150) + " " + req.failure()?.errorText);
  });
  await page.goto("/categoria/lupas", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(3000);
  const state = await page.evaluate(() => ({
    url: location.href,
    ready: document.readyState,
    cookiePanel: !!document.querySelector(".sg034-cookie-panel"),
    introSkipped: !!(window as any).__sgIntroSkipRequested,
    sg: typeof (window as any).SG,
    router: typeof (window as any).SG_ROUTER,
    scripts: [...document.scripts].map((s) => ({ src: s.src.split("/").slice(-2).join("/"), type: s.type })),
    resourceJs: performance.getEntriesByType("resource").filter((r) => /\.js($|\?)/.test(r.name)).length,
  }));
  console.log("BOOTSTRAP_DIAGNOSTICS_" + browserName + " " + JSON.stringify({ state, jsErrors, consoleErrors, failed }));
  expect(failed.filter((url) => url.includes("127.0.0.1:4174/assets/"))).toEqual([]);
  await expect(page.locator(".sg034-cookie-panel")).toBeVisible({ timeout: 10_000 });
  await expect.poll(() => page.evaluate(() => typeof (window as any).SG_ROUTER), { timeout: 15_000 }).toBe("object");
});
