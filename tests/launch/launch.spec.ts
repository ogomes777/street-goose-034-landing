import { expect, test } from "@playwright/test";

const categories = [
  ["lupas", "Lupas e Óculos"],
  ["acessorios", "Acessórios"],
  ["relogios", "Relógios"],
  ["perfumes", "Perfumes"],
  ["trajes", "Moletons e Trajes"],
] as const;

test("SEO: a home publica título e canonical", async ({ request }) => {
  const response = await request.get("/");
  expect(response.status()).toBe(200);
  const html = await response.text();
  expect(html).toContain("<title>Street Goose 034");
  expect(html).toContain('href="https://www.streetgoose034.com.br/"');
});

test("SEO: as cinco categorias possuem HTML acessível e links relacionados", async ({ request }) => {
  for (const [slug, label] of categories) {
    const response = await request.get("/categoria/" + slug);
    expect(response.status()).toBe(200);
    const html = await response.text();
    expect(html).toContain(">" + label + "</h1>");
    expect(html).toMatch(/<h1 class="cat-hero-title(?: cat-hero-title--long)?">/);
    expect(html).toContain('rel="canonical"');
    expect(html).toContain('class="cat-seo-links"');
    expect(html).toContain('class="cat-item is-static"');
  }
});

test("Mobile: categoria mantém título e navegação cruzada após iniciar o JavaScript", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/categoria/lupas", { waitUntil: "domcontentloaded" });
  await expect(page.locator(".category-page .cat-hero-title")).toHaveText("Lupas e Óculos", { timeout: 20_000 });
  await expect(page.locator(".category-page .cat-seo-links a")).toHaveCount(4, { timeout: 20_000 });
});

test("Mobile: o visitante encontra a seção principal da loja", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await expect(page).toHaveTitle(/Street Goose 034/);
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", "https://www.streetgoose034.com.br/");
});
