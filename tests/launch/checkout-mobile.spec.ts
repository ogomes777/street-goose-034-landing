import { expect, test, type Page } from "@playwright/test";

// Usa o catálogo local no navegador, sem criar pedidos no banco nem abrir WhatsApp real.
async function seedCart(page: Page) {
  await page.goto("/categoria/lupas", { waitUntil: "domcontentloaded" });
  await expect.poll(() => page.evaluate(() => Boolean((window as any).SG?.cart && (window as any).SG_ROUTER)), {
    timeout: 25_000,
  }).toBe(true);
  const seeded = await page.evaluate(() => {
    const sg = (window as any).SG;
    const p = (window as any).SG_PRODUCTS.find((x: any) => !x.soldOut);
    return p ? sg.cart.addItem(p.id, 1) : false;
  });
  expect(seeded, "O catálogo precisa ter pelo menos uma peça vendável").toBe(true);
}

test("Checkout mobile: bloqueia telefone, CEP e UF inválidos", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await seedCart(page);
  await page.evaluate(() => (window as any).SG_ROUTER.navigate("/checkout"));

  await expect(page.locator('[data-checkout-body] input[name="name"]')).toBeVisible();
  await page.locator('[data-checkout-body] input[name="name"]').fill("Cliente de Teste");
  await page.locator('[data-checkout-body] input[name="email"]').fill("cliente@example.com");
  await page.locator('[data-checkout-body] input[name="phone"]').fill("123");
  await page.locator('[data-checkout-next]').click();
  await expect(page.locator('[data-checkout-error]')).toContainText(/telefone com DDD/i, { timeout: 8000 });

  await page.locator('[data-checkout-body] input[name="phone"]').fill("34999999999");
  await page.locator('[data-checkout-next]').click();
  await expect(page.locator('[data-checkout-body] input[name="cep"]')).toBeVisible();

  await page.locator('[data-checkout-body] input[name="cep"]').fill("12");
  await page.locator('[data-checkout-body] input[name="street"]').fill("Rua de teste");
  await page.locator('[data-checkout-body] input[name="number"]').fill("100");
  await page.locator('[data-checkout-body] input[name="neighborhood"]').fill("Centro");
  await page.locator('[data-checkout-body] input[name="city"]').fill("Araxá");
  await page.locator('[data-checkout-body] input[name="state"]').fill("ZZ");
  await page.locator('[data-checkout-next]').click();
  await expect(page.locator('[data-checkout-error]')).toContainText("CEP", { timeout: 8000 });

  await page.locator('[data-checkout-body] input[name="cep"]').fill("38183000");
  await page.locator('[data-checkout-next]').click();
  await expect(page.locator('[data-checkout-error]')).toContainText("UF válida", { timeout: 8000 });
});

test("Checkout em modal: popup bloqueado mantém sacola e oferece link", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await seedCart(page);
  await page.locator('[data-sg034-consent="denied"]').click();
  await page.evaluate(() => {
    (window as any).open = () => null;
    (window as any).SG.startCheckout();
  });
  const form = page.locator('[data-checkout-form]');
  await expect(form).toBeVisible();
  await form.locator('input[name="name"]').fill("Cliente de Teste");
  await form.locator('input[name="email"]').fill("cliente@example.com");
  await form.locator('input[name="phone"]').fill("34999999999");
  await form.locator('input[name="cep"]').fill("38183000");
  await form.locator('input[name="street"]').fill("Rua de teste");
  await form.locator('input[name="number"]').fill("100");
  await form.locator('input[name="neighborhood"]').fill("Centro");
  await form.locator('input[name="city"]').fill("Araxá");
  await form.locator('input[name="state"]').fill("MG");
  await form.locator('button[type="submit"]').click();
  await expect(form.locator('[data-checkout-retry]')).toHaveAttribute("href", /wa\.me\//);
  expect(await page.evaluate(() => (window as any).SG.cart.itemCount())).toBeGreaterThan(0);
});

test("Economia de dados: filme pesado da home permanece sem pré-carregamento", async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "connection", { configurable: true, value: { saveData: true, effectiveType: "4g" } });
  });
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await expect.poll(() => page.evaluate(() => Boolean((window as any).SG_ROUTER)), { timeout: 25_000 }).toBe(true);
  await expect(page.locator('[data-hero-video]')).toHaveAttribute("preload", "none");
});
