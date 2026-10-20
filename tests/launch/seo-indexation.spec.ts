import { expect, test } from "@playwright/test";

// HTML and sitemap are emitted during build, not injected by a browser after load.
const origin = "https://www.streetgoose034.com.br";
const publicRoutes = [
  "/", "/categoria/lupas", "/categoria/acessorios", "/categoria/relogios",
  "/categoria/perfumes", "/categoria/trajes", "/recompensas", "/ranking",
  "/comunidade", "/termos", "/privacidade", "/trocas",
];

test("SEO: todas as 12 paginas publicas respondem com metadados canonicos proprios", async ({ request }) => {
  const pages = await Promise.all(publicRoutes.map(async (route) => {
    const response = await request.get(route);
    expect(response.status(), route).toBe(200);
    return { route, html: await response.text() };
  }));
  const titles = new Set<string>();
  const descriptions = new Set<string>();
  for (const { route, html } of pages) {
    const title = html.match(/<title>([^<]+)<\/title>/)?.[1] || "";
    const description = html.match(/<meta name="description" content="([^"]+)"/)?.[1] || "";
    const canonical = html.match(/<link rel="canonical" href="([^"]+)"/)?.[1] || "";
    expect(title.length, route).toBeGreaterThan(15);
    expect(description.length, route).toBeGreaterThan(55);
    expect(canonical, route).toBe(origin + route);
    expect(html, route).toContain('name="robots" content="index, follow');
    expect(html, route).toContain('property="og:title"');
    expect(html, route).toContain('type="application/ld+json"');
    expect(titles.has(title), "duplicate title: " + title).toBe(false);
    expect(descriptions.has(description), "duplicate description: " + description).toBe(false);
    titles.add(title);
    descriptions.add(description);
  }
});

test("SEO: sitemap contempla exatamente as URLs indexaveis", async ({ request }) => {
  const response = await request.get("/sitemap.xml");
  expect(response.status()).toBe(200);
  const xml = await response.text();
  const urls = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => match[1]);
  expect(urls.length).toBe(12);
  expect([...urls].sort()).toEqual(publicRoutes.map((route) => origin + route).sort());
  expect(xml).not.toContain("/checkout");
  expect(xml).not.toContain("/admin");
});

test("SEO: robots publica sitemap; checkout privado nao deve indexar", async ({ request }) => {
  const [robots, checkout] = await Promise.all([request.get("/robots.txt"), request.get("/checkout")]);
  expect(robots.status()).toBe(200);
  expect(await robots.text()).toContain("Sitemap: " + origin + "/sitemap.xml");
  expect(checkout.status()).toBe(200);
  const html = await checkout.text();
  expect(html).toContain('name="robots" content="noindex"');
  expect(html).not.toMatch(/<link rel="canonical" href=/);
});

test("SEO: todas as categorias publicam lista de pecas e breadcrumb estruturado", async ({ request }) => {
  for (const slug of ["lupas", "acessorios", "relogios", "perfumes", "trajes"]) {
    const response = await request.get("/categoria/" + slug);
    expect(response.status()).toBe(200);
    const html = await response.text();
    expect(html).toContain('class="cat-hero-poster"');
    expect(html).toContain('class="cat-catalog-grid"');
    expect(html).toContain('"BreadcrumbList"');
    expect(html).toContain('class="cat-seo-links"');
  }
});

test("LCP: categoria direta nao renderiza o hero oculto da home, SPA volta normalmente", async ({ page }) => {
  await page.goto("/categoria/lupas", { waitUntil: "domcontentloaded" });
  await expect(page.locator("html")).toHaveAttribute("data-entry-category", "");
  await expect(page.locator("main#top > section.hero")).toHaveCSS("display", "none");
  await page.waitForFunction(() => typeof (window as any).SG_ROUTER?.navigate === "function");
  await page.evaluate(() => (window as any).SG_ROUTER.navigate("/"));
  await expect(page.locator("html")).not.toHaveAttribute("data-entry-category", "");
  await expect(page.locator("main#top > section.hero")).not.toHaveCSS("display", "none");
});
