import { expect, test } from "@playwright/test";

test("Core Web Vitals: coleta não envia dados sem consentimento", async ({ page }) => {
  await page.addInitScript(() => window.localStorage.setItem("sg034_analytics_consent_v1", "denied"));
  await page.goto("/checkout", { waitUntil: "domcontentloaded" });
  const state = await page.evaluate(() => ({
    gtag: typeof (window as any).gtag,
    injected: Boolean(document.querySelector("script[data-sg034-ga4]")),
  }));
  expect(state).toEqual({ gtag: "undefined", injected: false });
});

test("Core Web Vitals: evento GA4 só depois da autorização e sem PII", async ({ page }) => {
  await page.addInitScript(() => window.localStorage.setItem("sg034_analytics_consent_v1", "accepted"));
  await page.route("https://www.googletagmanager.com/**", (route) => route.abort());
  await page.goto("/categoria/lupas", { waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => typeof (window as any).gtag === "function");
  await page.waitForTimeout(700);
  await page.evaluate(() => window.dispatchEvent(new Event("pagehide")));
  const result = await page.evaluate(() => ({
    supported: PerformanceObserver.supportedEntryTypes || [],
    events: (window as any).dataLayer
      .map((item: IArguments) => Array.from(item))
      .filter((item: unknown[]) => item[0] === "event" && item[1] === "web_vital")
      .map((item: unknown[]) => item[2] as Record<string, unknown>),
  }));
  if (result.supported.includes("layout-shift")) {
    expect(result.events.some((event: Record<string, unknown>) => event.metric_name === "CLS")).toBe(true);
  }
  for (const event of result.events) {
    expect(["LCP", "CLS", "INP_estimate"]).toContain(event.metric_name);
    expect(typeof event.metric_value).toBe("number");
    expect(event).not.toHaveProperty("email");
    expect(event).not.toHaveProperty("user_id");
  }
});
