import { expect, test } from "@playwright/test";

// Contrato de eventos do navegador. Não acessa a propriedade GA4 nem
// cria pedidos reais; intercepta o script externo para não contaminar métricas.
test("GA4: sem consentimento não injeta tag nem transmite eventos", async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("sg034_analytics_consent_v1", "denied"));
  let thirdPartyRequests = 0;
  await page.route("https://www.googletagmanager.com/**", route => {
    thirdPartyRequests++;
    return route.abort();
  });
  await page.goto("/checkout", { waitUntil: "domcontentloaded" });
  await expect(page.locator("script[data-sg034-ga4]")).toHaveCount(0);
  await page.evaluate(() => document.dispatchEvent(new CustomEvent("sg:analytics", {
    detail: { event: "whatsapp_click", location: "checkout" },
  })));
  expect(await page.evaluate(() => typeof (window as any).gtag)).toBe("undefined");
  expect(thirdPartyRequests).toBe(0);
});

test("GA4: com consentimento injeta tag correta e traduz eventos sem PII nem purchase", async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("sg034_analytics_consent_v1", "accepted"));
  await page.route("https://www.googletagmanager.com/**", route => route.abort());
  await page.goto("/checkout", { waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => typeof (window as any).gtag === "function", null, { timeout: 30_000 });

  const result = await page.evaluate(() => {
    const fire = (detail: Record<string, unknown>) =>
      document.dispatchEvent(new CustomEvent("sg:analytics", { detail }));
    fire({ event: "whatsapp_click", location: "footer", email: "nao-enviar@example.com" });
    fire({ event: "product_open", product_id: "lupa-01", location: "category", phone: "34999999999" });
    fire({ event: "add_to_cart", product_id: "lupa-01" });
    fire({ event: "begin_checkout", location: "cart" });
    fire({ event: "order_created", items: 2, has_unpriced: false, customer_name: "NAO ENVIAR" });
    fire({ event: "newsletter_submit", email: "nao-enviar@example.com" });
    fire({ event: "purchase", transaction_id: "nao-gerar" }); // proibido no checkout WhatsApp
    const calls = (window as any).dataLayer
      .filter((a: unknown) => typeof a === "object" && a !== null && "length" in a)
      .map((a: IArguments) => Array.from(a));
    const events = calls.filter((c: unknown[]) => c[0] === "event");
    return {
      scripts: document.querySelectorAll("script[data-sg034-ga4]").length,
      src: (document.querySelector("script[data-sg034-ga4]") as HTMLScriptElement)?.src,
      configs: calls.filter((c: unknown[]) => c[0] === "config"),
      events,
    };
  });
  expect(result.scripts).toBe(1);
  expect(result.src).toContain("id=G-XPZWPBGLDN");
  expect(result.configs).toHaveLength(1);
  expect(result.configs[0][1]).toBe("G-XPZWPBGLDN");
  expect(result.events.map((e: unknown[]) => e[1])).toEqual([
    "click_whatsapp", "view_item", "add_to_cart", "begin_checkout",
    "generate_lead", "newsletter_signup",
  ]);
  const lead = result.events.find((e: unknown[]) => e[1] === "generate_lead")![2] as Record<string, unknown>;
  expect(lead).toMatchObject({ lead_type: "pedido_whatsapp", item_count: 2, has_unpriced: false });
  for (const event of result.events) {
    const payload = JSON.stringify(event[2]);
    expect(payload).not.toContain("nao-enviar@example.com");
    expect(payload).not.toContain("34999999999");
    expect(payload).not.toContain("NAO ENVIAR");
  }
});

test("GA4: aceitar depois não reenvia eventos anteriores ao consentimento", async ({ page }) => {
  await page.addInitScript(() => localStorage.removeItem("sg034_analytics_consent_v1"));
  await page.route("https://www.googletagmanager.com/**", route => route.abort());
  await page.goto("/checkout", { waitUntil: "domcontentloaded" });
  await expect(page.locator('[data-sg034-consent="accepted"]')).toHaveCount(1);
  await page.evaluate(() => {
    document.dispatchEvent(new CustomEvent("sg:analytics", {
      detail: { event: "whatsapp_click", location: "before_consent" },
    }));
    (document.querySelector('[data-sg034-consent="accepted"]') as HTMLButtonElement).click();
  });
  await page.waitForFunction(() => typeof (window as any).gtag === "function", null, { timeout: 30_000 });
  const calls = await page.evaluate(() => (window as any).dataLayer
    .filter((a: unknown) => typeof a === "object" && a !== null && "length" in a)
    .map((a: IArguments) => Array.from(a)));
  expect(calls.some((c: unknown[]) => c[0] === "event" && c[2]?.cta_location === "before_consent")).toBe(false);
  expect(calls.filter((c: unknown[]) => c[0] === "config")).toHaveLength(1);
  expect(await page.evaluate(() => localStorage.getItem("sg034_analytics_consent_v1"))).toBe("accepted");
});

test("GA4: visita direta de pedido oculta ID no parâmetro page_location", async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("sg034_analytics_consent_v1", "accepted"));
  await page.route("https://www.googletagmanager.com/**", route => route.abort());
  await page.goto("/pedido/pedido-sensivel-0001", { waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => typeof (window as any).gtag === "function", null, { timeout: 30_000 });
  const config = await page.evaluate(() => (window as any).dataLayer
    .filter((a: unknown) => typeof a === "object" && a !== null && "length" in a)
    .map((a: IArguments) => Array.from(a))
    .find((a: unknown[]) => a[0] === "config"));
  expect(config[2].page_location).toBe("http://127.0.0.1:4174/pedido/:id");
  expect(JSON.stringify(config)).not.toContain("pedido-sensivel-0001");
});
