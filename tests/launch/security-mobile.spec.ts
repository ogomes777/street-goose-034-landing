import { expect, test } from "@playwright/test";

test("Sem consentimento, GA4 não injeta tag de rastreamento", async ({ page }) => {
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await expect(page.locator(".sg034-cookie-panel")).toBeVisible();
  await expect(page.locator("script[data-sg034-ga4]")).toHaveCount(0);
  await page.locator('[data-sg034-consent="denied"]').click();
  await expect(page.locator(".sg034-cookie-panel")).toHaveCount(0);
  await expect(page.locator("script[data-sg034-ga4]")).toHaveCount(0);
  const stored = await page.evaluate(() => window.localStorage.getItem("sg034_analytics_consent_v1"));
  expect(stored).toBe("denied");
});

test("Páginas de conta e checkout são noindex no HTML original", async ({ request }) => {
  for (const path of ["/admin", "/conta", "/checkout", "/sacola"]) {
    const response = await request.get(path);
    expect(response.status(), path).toBe(200);
    const html = await response.text();
    expect(html, path).toContain('name="robots" content="noindex"');
  }
});

test("Mobile: links entre categorias continuam clicáveis depois da hidratação", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/categoria/lupas", { waitUntil: "domcontentloaded" });
  // O aviso fixo pode cobrir o último link em uma viewport estreita.
  // Recusar cookies preserva a privacidade e deixa o teste de navegação isolado.
  await page.locator('[data-sg034-consent="denied"]').click();
  const anchor = page.locator('.category-page .cat-seo-links a[href="/categoria/relogios"]');
  await expect(anchor).toBeVisible({ timeout: 20_000 });
  await anchor.click();
  await expect(page).toHaveURL(/\/categoria\/relogios$/);
  await expect(page.locator(".category-page .cat-hero-title")).toHaveText("Relógios", { timeout: 20_000 });
});

test("Economia de dados: categoria não cria vídeo de hero", async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "connection", {
      configurable: true,
      value: { saveData: true },
    });
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/categoria/lupas", { waitUntil: "domcontentloaded" });
  await expect.poll(async () => {
    return page.locator("[data-category-page]").evaluate((el) => !el.hasAttribute("data-prerendered"));
  }, { timeout: 20_000 }).toBe(true);
  await expect(page.locator("[data-category-page] [data-cat-video]")).toHaveCount(0);
  await expect(page.locator(".category-page .cat-hero-poster")).toBeVisible();
});
