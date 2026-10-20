// Street Goose 034 — HTML de cada rota pública, gerado no build.
// O site é uma página só (index.html) e as rotas abrem por cima dela. Para
// buscadores e prévias de redes sociais, cada URL ganha o próprio arquivo:
// título, descrição, canonical, Open Graph e dados estruturados da rota
// (js/route-meta.js). As categorias levam também o topo e a lista de peças
// com a mesma marcação que js/category-page.js monta, então a troca para o
// app é invisível. Também gera o sitemap.xml.
// vercel.json aponta cada rota para o seu arquivo.
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import type { Plugin } from "vite";
import { ROUTE_META, SITE_NAME, SITE_ORIGIN } from "../js/route-meta.js";
import { CATALOG_CATEGORIES, PRODUCT_GROUPS, productAlt, productName } from "../js/catalog-data.js";

type Meta = { index: boolean; title: string; description?: string; h1?: string };
type ProductRow = { id: string; category: string; name: string | null; images: string[] | null; hidden: boolean; sort_order: number | null; is_custom: boolean };
type StaticItem = { id: string; name: string; alt: string; image: string; order: number };

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
// JSON-LD inside <script>: no "</script>" can close it early
const ldJson = (data: unknown) => JSON.stringify(data).replace(/</g, "\\u003c");
const toPosix = (p: string) => p.split("\\").join("/");
const stem = (file: string) => file.replace(/\.[^.]+$/, "");

/** Output file of a route: "/categoria/lupas" -> "categoria/lupas.html" */
export function routeFile(route: string): string {
  return route.replace(/^\//, "").replace(":id", "id") + ".html";
}

function replaceOne(html: string, pattern: RegExp, value: string, what: string): string {
  if (!pattern.test(html)) throw new Error(`seo-pages: ${what} não encontrado no index.html`);
  return html.replace(pattern, value);
}

// Live catalog edits (hidden pieces, renamed, reordered, created in /admin)
// so the HTML matches what the visitor sees. Without the database the
// factory catalog is used — never fails the build.
async function fetchProductRows(url: string | undefined, key: string | undefined): Promise<ProductRow[]> {
  if (!url || !key) return [];
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 6000);
  try {
    const res = await fetch(url.replace(/\/$/, "") + "/rest/v1/products?select=id,category,name,images,hidden,sort_order,is_custom", {
      headers: { apikey: key, Authorization: "Bearer " + key },
      signal: controller.signal,
    });
    return res.ok ? ((await res.json()) as ProductRow[]) : [];
  } catch {
    return [];
  } finally {
    clearTimeout(timer);
  }
}

export function seoPages(): Plugin {
  const assetUrl = new Map<string, string>(); // "assets/x/y.png" -> "/assets/y-hash.png"
  let root = "";
  let outDir = "";
  let env: Record<string, string> = {};

  function imageFor(folder: string, file: string): string | null {
    const s = stem(file);
    return assetUrl.get(`assets/web-products/${folder}/${s}.webp`)
      ?? assetUrl.get(`assets/products-processed/${folder}/${s}.png`)
      ?? assetUrl.get(`assets/${folder}/${file}`)
      ?? null;
  }

  function categoryItems(cat: (typeof CATALOG_CATEGORIES)[number], rows: Map<string, ProductRow>, storage: string): StaticItem[] {
    const dir = path.join(root, "assets", cat.folder);
    if (!existsSync(dir)) return [];
    const extras = new Set(Object.values(PRODUCT_GROUPS).flat());
    const files = readdirSync(dir).filter((f) => /\.(png|jpe?g|webp)$/i.test(f)).sort();
    const items: StaticItem[] = [];
    let shown = 0;
    files.forEach((file, i) => {
      if (extras.has(stem(file))) return;
      const n = ++shown;
      const id = cat.id + "-" + String(i + 1).padStart(2, "0");
      const factoryImage = imageFor(cat.folder, file);
      const row = rows.get(id);
      if (row?.hidden || !factoryImage) return;
      const ref = row?.images?.[0];
      const image = ref && !/^base:/.test(ref) ? storage + ref : factoryImage;
      items.push({ id, name: row?.name || productName(cat.label, n), alt: productAlt(cat.label, n), image, order: row?.sort_order ?? n * 10 });
    });
    rows.forEach((row) => {
      if (!row.is_custom || row.hidden || row.category !== cat.id || !row.name || !row.images?.length || /^base:/.test(row.images[0])) return;
      items.push({ id: row.id, name: row.name, alt: row.name + " — Street Goose 034", image: storage + row.images[0], order: row.sort_order ?? 100000 });
    });
    return items.sort((a, b) => a.order - b.order || (a.id < b.id ? -1 : 1));
  }

  // Same structure and classes as js/category-page.js, so the app's mount
  // replaces it in place. Prices and buttons come with the app (live data).
  function categoryMarkup(slug: string, label: string, description: string, poster: string, items: StaticItem[]): string {
    const others = CATALOG_CATEGORIES.filter((c) => c.slug !== slug)
      .map((c) => `<a href="/categoria/${c.slug}">${esc(c.label)}</a>`).join("");
    return (
      `<a class="cat-close" href="/" aria-label="Voltar para a loja"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg></a>` +
      `<section class="cat-hero"><img class="cat-hero-bg" src="${poster}" alt="" aria-hidden="true" />` +
      `<img class="cat-hero-poster" src="${poster}" alt="" fetchpriority="high" />` +
      `<div class="cat-hero-scrim"></div>` +
      `<div class="cat-hero-copy"><p class="cat-hero-kicker">STREET GOOSE 034</p><h1 class="cat-hero-title">${esc(label)}</h1></div></section>` +
      `<div class="cat-catalog"><div class="cat-catalog-head"><h2>${esc(label)}</h2><p>${items.length} peças</p></div>` +
      `<p class="cat-seo-lead">${esc(description)}</p>` +
      `<div class="cat-catalog-grid">` +
      items.map((it) =>
        `<article class="cat-item is-static" data-product-id="${esc(it.id)}"><div class="cat-item-img"><img src="${esc(it.image)}" alt="${esc(it.alt)}" loading="lazy" /></div>` +
        `<div class="cat-item-body"><p class="cat-item-name">${esc(it.name)}</p></div></article>`).join("") +
      `</div><nav class="cat-seo-links" aria-label="Outras categorias">${others}</nav></div>`
    );
  }

  function withMeta(base: string, route: string, meta: Meta, image: string | null): string {
    const url = SITE_ORIGIN + route;
    const description = meta.description ?? (ROUTE_META as Record<string, Meta>)["/"].description ?? "";
    // the home's first hero slide (with its H1) belongs to the home only
    let html = replaceOne(base, /<div class="hero-slide-content" data-static-slide>[\s\S]*?<\/a><\/div><\/div>/, "", "slide estático do hero");
    html = replaceOne(html, /<title>[^<]*<\/title>/, `<title>${esc(meta.title)}</title>`, "title");
    html = replaceOne(html, /<meta name="description" content="[^"]*"/, `<meta name="description" content="${esc(description)}"`, "description");
    html = replaceOne(html, /<meta name="robots" content="[^"]*"/, `<meta name="robots" content="${meta.index ? "index, follow, max-image-preview:large" : "noindex"}"`, "robots");
    html = replaceOne(html, /<link rel="canonical" href="[^"]*" \/>/, meta.index ? `<link rel="canonical" href="${url}" />` : "", "canonical");
    html = replaceOne(html, /<meta property="og:url" content="[^"]*"/, `<meta property="og:url" content="${url}"`, "og:url");
    html = replaceOne(html, /<meta property="og:title" content="[^"]*"/, `<meta property="og:title" content="${esc(meta.title)}"`, "og:title");
    html = replaceOne(html, /<meta property="og:description" content="[^"]*"/, `<meta property="og:description" content="${esc(description)}"`, "og:description");
    if (image) html = replaceOne(html, /<meta property="og:image" content="[^"]*"/, `<meta property="og:image" content="${SITE_ORIGIN}${image}"`, "og:image");
    // Every route inherits the home markup. Do not preload the home hero poster
    // when a visitor enters a category/checkout directly. For categories, give
    // the actually visible category poster the high-priority request instead.
    html = replaceOne(html,
      /<link rel="preload" as="image" href="[^"]*hero-poster-960[^"]*" fetchpriority="high" \/>/,
      image ? `<link rel="preload" as="image" href="${esc(image)}" fetchpriority="high" />` : "",
      "preload exclusivo da home");
    // the home's Organization/WebSite graph stays on the home; other public
    // pages describe where they sit in the site
    const ld = meta.index
      ? `<script type="application/ld+json">${ldJson({
          "@context": "https://schema.org",
          "@type": "BreadcrumbList",
          itemListElement: [
            { "@type": "ListItem", position: 1, name: SITE_NAME, item: SITE_ORIGIN + "/" },
            { "@type": "ListItem", position: 2, name: meta.h1 ?? meta.title.replace(/ \| .*$/, ""), item: url },
          ],
        })}</script>`
      : "";
    return replaceOne(html, /<script type="application\/ld\+json">[\s\S]*?<\/script>/, ld, "JSON-LD");
  }

  return {
    name: "street-goose-seo-pages",
    apply: "build",
    configResolved(config) {
      root = config.root;
      outDir = path.resolve(config.root, config.build.outDir);
      env = config.env as Record<string, string>;
    },
    generateBundle(_options, bundle) {
      for (const file of Object.values(bundle)) {
        if (file.type !== "asset") continue;
        for (const name of file.originalFileNames ?? []) assetUrl.set(toPosix(name), "/" + file.fileName);
      }
    },
    async closeBundle() {
      const indexPath = path.join(outDir, "index.html");
      // og:image must be an absolute URL for social previews
      const base = readFileSync(indexPath, "utf8").replace(/(<meta property="og:image" content=")\/(?!\/)/, `$1${SITE_ORIGIN}/`);
      writeFileSync(indexPath, base);

      const supabaseUrl = env.VITE_SUPABASE_URL;
      const rows = new Map((await fetchProductRows(supabaseUrl, env.VITE_SUPABASE_ANON_KEY)).map((r) => [r.id, r]));
      const storage = (supabaseUrl ?? "").replace(/\/$/, "") + "/storage/v1/object/public/products/";
      const overlay = /<section class="category-page" data-category-page hidden aria-label="([^"]*)"><\/section>/;

      for (const [route, meta] of Object.entries(ROUTE_META as Record<string, Meta>)) {
        if (route === "/") continue;
        const cat = CATALOG_CATEGORIES.find((c) => route === "/categoria/" + c.slug);
        const poster = cat ? assetUrl.get(`assets/heroes/loop/hero-${cat.slug}-poster.jpg`) ?? null : null;
        let html = withMeta(base, route, meta, poster);
        if (cat && poster) {
          const items = categoryItems(cat, rows, storage);
          html = replaceOne(html, overlay,
            `<section class="category-page" data-category-page data-prerendered aria-label="$1">${categoryMarkup(cat.slug, cat.label, meta.description ?? "", poster, items)}</section>`,
            "overlay da categoria");
        }
        const out = path.join(outDir, routeFile(route));
        mkdirSync(path.dirname(out), { recursive: true });
        writeFileSync(out, html);
      }

      // sitemap: only public, indexable, canonical URLs. No <lastmod>: the
      // build cannot know when each page's content really changed.
      const urls = Object.entries(ROUTE_META as Record<string, Meta>).filter(([, m]) => m.index).map(([route]) => SITE_ORIGIN + route);
      writeFileSync(path.join(outDir, "sitemap.xml"),
        `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
        urls.map((u) => `  <url><loc>${u}</loc></url>`).join("\n") + `\n</urlset>\n`);
    },
  };
}
