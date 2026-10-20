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

test("SEO: sitemap sinaliza somente atualizações significativas e verificáveis", async ({ request }) => {
  const response = await request.get("/sitemap.xml");
  expect(response.status()).toBe(200);
  const xml = await response.text();
  const tags = [...xml.matchAll(/<url><loc>([^<]+)<\/loc>(?:<lastmod>([^<]+)<\/lastmod>)?<\/url>/g)];
  expect(tags).toHaveLength(12);
  const fresh = ["/", "/categoria/lupas", "/categoria/acessorios", "/categoria/relogios", "/categoria/perfumes", "/categoria/trajes"];
  for (const [, url, date] of tags) {
    const relative = new URL(url).pathname;
    expect(date || undefined).toBe(fresh.includes(relative) ? "2026-10-20" : undefined);
  }
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


test("LCP: categoria direta esconde apenas a pintura da home, sem mexer no layout", async ({ page }) => {
  await page.goto("/categoria/lupas", { waitUntil: "domcontentloaded" });
  await expect(page.locator("html")).toHaveAttribute("data-sg-direct-category", "");
  const homeHero = page.locator("main#top > section.hero");
  await expect(homeHero).toHaveCSS("visibility", "hidden");
  const before = await homeHero.boundingBox();
  expect(before?.height).toBeGreaterThan(200);
  // SEO markup for direct entry remains visible and crawlable.
  await expect(page.locator("[data-category-page] .cat-hero-poster")).toBeVisible();
  await page.waitForFunction(() => typeof (window as any).SG_ROUTER?.navigate === "function");
  await page.evaluate(() => (window as any).SG_ROUTER.navigate("/"));
  await expect(page.locator("html")).not.toHaveAttribute("data-sg-direct-category", "");
  await expect(homeHero).toHaveCSS("visibility", "visible");
  const after = await homeHero.boundingBox();
  expect(after?.height).toBeCloseTo(before!.height, 0);
});

test("LCP: hidratacao da categoria preserva o poster ja pintado pelo HTML", async ({ page }) => {
  await page.addInitScript(() => {
    (window as any).__initialCategoryPoster = null;
    const observer = new MutationObserver(() => {
      if (!(window as any).__initialCategoryPoster) {
        const poster = document.querySelector("[data-category-page] .cat-hero-poster");
        if (poster) (window as any).__initialCategoryPoster = poster;
      }
    });
    observer.observe(document, { subtree: true, childList: true });
  });
  await page.goto("/categoria/lupas", { waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => document.querySelector("[data-category-page] [data-cat-video]") !== null);
  const stable = await page.evaluate(() => (window as any).__initialCategoryPoster === document.querySelector("[data-category-page] .cat-hero-poster"));
  expect(stable).toBe(true);
  await expect(page.locator("[data-category-page] [data-cat-cue]")).toBeVisible();
  await expect(page.locator("[data-category-page] .cat-item")).not.toHaveCount(0);
  await page.locator("[data-category-page] .cat-close").click();
  await expect(page).toHaveURL("/");
});

test("Mobile: filmes H264 mantidos com variantes compactas sem mudar o poster", async ({ page, request }) => {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.goto("/categoria/lupas", { waitUntil: "domcontentloaded" });
  // Aguarda a hidratação do hero SSR. iPhone/WebKit e CPUs lentas podem
  // levar mais de 5 segundos com vídeo pesado e tarefas em segundo plano.
  await expect(page.locator("[data-category-page] [data-cat-cue]")).toBeVisible({ timeout: 20_000 });
  const source = page.locator("[data-category-page] video.cat-hero-video source");
  // Economia de dados remove intencionalmente a tag de vídeo; o pôster fica.
  const reduced = await page.evaluate(() => {
    const sg = (window as any).SG;
    const conn = (navigator as any).connection;
    return Boolean((sg?.prefersReducedMotion && sg.prefersReducedMotion()) || conn?.saveData);
  });
  if (reduced) {
    await expect(source).toHaveCount(0);
    await expect(page.locator("[data-category-page] .cat-hero-poster")).toBeVisible();
    return;
  }
  await expect(source).toHaveCount(1, { timeout: 15_000 });
  const src = await source.getAttribute("src");
  expect(src).toMatch(/hero-lupas-.*\.mp4/);
  const video = await request.get(src!);
  expect(video.status()).toBe(200);
  const bytes = (await video.body()).length;
  expect(bytes).toBeGreaterThan(100_000);
  expect(bytes).toBeLessThan(3_000_000);
  await expect(page.locator("[data-category-page] .cat-hero-poster")).toBeVisible();
});

test("Contato oficial: Instagram, suporte e CNPJ aparecem no site e termos", async ({ page, request }) => {
  test.setTimeout(90000); // Mobile lento: aguarda inicialização real sem falsos negativos por CPU compartilhada
  await page.goto("/", { waitUntil: "domcontentloaded" });
  // Em iPhones simulados com CPU lenta, o bootstrap da loja pode terminar
  // depois de domcontentloaded. Aguardar a inicialização real, não um timer fixo.
  await page.waitForFunction(() => Boolean((window as any).SG_CONTACT_CONFIG?.instagramHandle), null, { timeout: 30000 });
  await expect(page.locator("footer a[data-contact-instagram]")).toHaveAttribute(
    "href", "https://instagram.com/street_goose034", { timeout: 30000 }
  );
  await expect(page.locator("footer a[href='mailto:streetlupas034@gmail.com']")).toHaveCount(1);
  await expect(page.locator("footer")).toContainText("45.692.155/0001-74");
  const cfg = await page.evaluate(() => (window as any).SG_COMPANY_CONFIG);
  expect(cfg).toMatchObject({ cnpj: "45.692.155/0001-74", email: "streetlupas034@gmail.com", legalName: "Tiago Gabriel Barros Carneiro" });
  await page.goto("/termos", { waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => Boolean(document.querySelector(".legal-company")?.textContent?.includes("streetlupas034@gmail.com")), null, { timeout: 30000 });
  await expect(page.locator(".legal-company")).toContainText("45.692.155/0001-74", { timeout: 30000 });
  await expect(page.locator(".legal-company")).toContainText("Tiago Gabriel Barros Carneiro", { timeout: 15000 });
  await expect(page.locator(".legal-company")).toContainText("streetlupas034@gmail.com", { timeout: 15000 });
  const html = await (await request.get("/")).text();
  expect(html).toContain('"taxID":"45.692.155/0001-74"');
  expect(html).toContain('"legalName":"Tiago Gabriel Barros Carneiro"');
  expect(html).toContain('"sameAs":["https://www.instagram.com/street_goose034/"]');
});


test("SEO comercial: categorias têm intenção de compra, H1, conteúdo próprio e links rastreáveis no HTML", async ({ request }) => {
  const cases = [
    { slug: "lupas", title: "Lupas e Óculos de Estilo Urbano", h1: "Lupas e Óculos", heading: "Lupas e óculos para um visual de rua" },
    { slug: "acessorios", title: "Acessórios Streetwear: Mochilas e Coletes", h1: "Acessórios", heading: "Mochilas, coletes e acessórios streetwear" },
    { slug: "relogios", title: "Relógios de Estilo Urbano", h1: "Relógios", heading: "Relógios para completar o estilo urbano" },
    { slug: "perfumes", title: "Perfumes e Fragrâncias", h1: "Perfumes", heading: "Perfumes e fragrâncias para marcar presença" },
    { slug: "trajes", title: "Moletons e Roupas Streetwear", h1: "Moletons e Trajes", heading: "Moletons e blusas de frio streetwear" },
  ];
  for (const entry of cases) {
    const resp = await request.get("/categoria/" + entry.slug);
    expect(resp.status()).toBe(200);
    const html = await resp.text();
    expect(html).toContain(entry.title);
    expect(html).toContain(entry.heading);
    expect(html).toMatch(new RegExp("<h1[^>]*>" + entry.h1 + "</h1>"));
    expect([...html.matchAll(/<h1(?:\s|>)/g)]).toHaveLength(1);
    expect(html).toContain('class="cat-seo-guide"');
    expect(html).toContain('class="cat-seo-links"');
    expect(html).toContain('href="/categoria/lupas"');
    expect(html).toContain('href="/categoria/trajes"');
    expect(html).not.toContain('<meta name="keywords"');
  }
  const home = await (await request.get("/")).text();
  expect(home).toContain("Lupas, óculos e moda streetwear");
  expect(home).toContain('class="sg-seo-home-links"');
  expect(home).toContain("Mochilas e acessórios");
  expect(home).toContain("Araxá (MG)");
});

test("SEO comercial: o guia continua visível após hidratar a categoria", async ({ page }) => {
  await page.goto("/categoria/lupas", { waitUntil: "domcontentloaded" });
  await expect(page.locator("[data-category-page] [data-cat-cue]")).toBeVisible({ timeout: 20000 });
  await expect(page.locator("[data-category-page] .cat-seo-guide")).toContainText("Lupas e óculos para um visual de rua");
  await expect(page.locator("[data-category-page] .cat-hero-title")).toHaveText("Lupas e Óculos");
  await expect(page.locator("[data-category-page] .cat-seo-links a[href='/categoria/trajes']")).toContainText("Moletons e trajes");
});
