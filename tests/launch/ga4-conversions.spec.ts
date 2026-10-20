import { expect, test } from "@playwright/test";

// Test the actual consent bridge without sending synthetic leads to Google's GA4.
// The remote analytics script is aborted; assertions inspect gtag's in-memory queue.
async function openWithConsent(page: import("@playwright/test").Page, choice: "accepted" | "denied") {
  await page.addInitScript((value) => localStorage.setItem("sg034_analytics_consent_v1", value), choice);
  await page.route("https://www.googletagmanager.com/**", (route) => route.abort());
  await page.goto("/categoria/lupas", { waitUntil: "domcontentloaded" });
}

test("GA4: sem autorização não existe tag, nem saída de leads", async ({ page }) => {
  await openWithConsent(page, "denied");
  await page.evaluate(() => document.dispatchEvent(new CustomEvent("sg:analytics", {
    detail: { event: "order_created", items: 2, has_unpriced: false },
  })));
  const state = await page.evaluate(() => ({
    gtag: typeof (window as any).gtag,
    injected: Boolean(document.querySelector("script[data-sg034-ga4]")),
  }));
  expect(state).toEqual({ gtag: "undefined", injected: false });
});

test("GA4: apenas pedido confirmado é lead, sem contar clique nem newsletter", async ({ page }) => {
  await openWithConsent(page, "accepted");
  await page.waitForFunction(() => typeof (window as any).gtag === "function");

  const events = await page.evaluate(() => {
    const emit = (detail: Record<string, unknown>) =>
      document.dispatchEvent(new CustomEvent("sg:analytics", { detail }));
    emit({ event: "whatsapp_click", location: "checkout", email: "nao@enviar.com" });
    emit({ event: "newsletter_submit", email: "nao@enviar.com" });
    emit({ event: "begin_checkout", location: "cart" });
    emit({ event: "order_created", items: 3, has_unpriced: true, email: "nao@enviar.com" });
    emit({ event: "purchase", value: 100000 }); // not an accepted event, payment not confirmed
    return (window as any).dataLayer
      .filter((row: IArguments | Record<string, unknown>) => Object.prototype.toString.call(row) === "[object Arguments]")
      .map((row: IArguments) => Array.from(row))
      .filter((row: unknown[]) => row[0] === "event")
      .map((row: unknown[]) => ({ name: row[1] as string, params: row[2] as Record<string, unknown> }));
  });

  expect(events.filter((event) => event.name === "generate_lead")).toHaveLength(1);
  expect(events.filter((event) => event.name === "click_whatsapp")).toHaveLength(1);
  expect(events.filter((event) => event.name === "newsletter_signup")).toHaveLength(1);
  expect(events.filter((event) => event.name === "begin_checkout")).toHaveLength(1);
  expect(events.filter((event) => event.name === "purchase")).toHaveLength(0);
  expect(events.find((event) => event.name === "generate_lead")?.params).toMatchObject({
    lead_type: "pedido_whatsapp", item_count: 3, has_unpriced: true,
  });
  for (const event of events) {
    const serialized = JSON.stringify(event.params);
    expect(serialized).not.toContain("nao@enviar.com");
    expect(event.params).not.toHaveProperty("order_id");
    expect(event.params).not.toHaveProperty("phone");
    expect(event.params).not.toHaveProperty("email");
  }
});

test("GA4: page_view não é duplicado manualmente na inicialização", async ({ page }) => {
  await openWithConsent(page, "accepted");
  await page.waitForFunction(() => typeof (window as any).gtag === "function");
  const config = await page.evaluate(() => (window as any).dataLayer
    .filter((row: IArguments | Record<string, unknown>) => Object.prototype.toString.call(row) === "[object Arguments]")
    .map((row: IArguments) => Array.from(row)));
  expect(config.filter((row: unknown[]) => row[0] === "config" && row[1] === "G-XPZWPBGLDN")).toHaveLength(1);
  expect(config.filter((row: unknown[]) => row[0] === "event" && row[1] === "page_view")).toHaveLength(0);
});
