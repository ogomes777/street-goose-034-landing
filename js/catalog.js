/* Street Goose 034 — catálogo consolidado das pastas de produto brutas +
   metadados das 5 categorias (hero video, cor, rota). Essas imagens ainda
   não têm nome, preço ou descrição reais (só arquivos soltos tipo "ChatGPT
   Image ... .png" ou fotos de WhatsApp sem legenda) — por isso cada item
   recebe identificação sequencial honesta ("Peça 01") em vez de
   nome/especificação inventada. window.SG_CATALOG alimenta as páginas de
   categoria (ver category-page.js) e os cards de portal (ver
   category-portals.js). import.meta.glob evita digitar à mão os ~118 nomes
   de arquivo (com vírgula, acento e parênteses) — Vite resolve o caminho
   real de cada um. */
import heroLupasVideo from "../assets/heroes/web/hero-lupas.mp4";
import heroLupasVideoMobile from "../assets/heroes/web-mobile/hero-lupas.mp4";
import heroLupasPoster from "../assets/heroes/web/hero-lupas-poster.jpg";
import heroLupasPreview from "../assets/heroes/previews/hero-lupas.mp4";
import heroAcessoriosVideo from "../assets/heroes/web/hero-acessorios.mp4";
import heroAcessoriosVideoMobile from "../assets/heroes/web-mobile/hero-acessorios.mp4";
import heroAcessoriosPoster from "../assets/heroes/web/hero-acessorios-poster.jpg";
import heroAcessoriosPreview from "../assets/heroes/previews/hero-acessorios.mp4";
import heroRelogiosVideo from "../assets/heroes/web/hero-relogios.mp4";
import heroRelogiosVideoMobile from "../assets/heroes/web-mobile/hero-relogios.mp4";
import heroRelogiosPoster from "../assets/heroes/web/hero-relogios-poster.jpg";
import heroRelogiosPreview from "../assets/heroes/previews/hero-relogios.mp4";
import heroPerfumesVideo from "../assets/heroes/web/hero-perfumes.mp4";
import heroPerfumesVideoMobile from "../assets/heroes/web-mobile/hero-perfumes.mp4";
import heroPerfumesPoster from "../assets/heroes/web/hero-perfumes-poster.jpg";
import heroPerfumesPreview from "../assets/heroes/previews/hero-perfumes.mp4";
import heroTrajesVideo from "../assets/heroes/web/hero-trajes.mp4";
import heroTrajesVideoMobile from "../assets/heroes/web-mobile/hero-trajes.mp4";
import heroTrajesPoster from "../assets/heroes/web/hero-trajes-poster.jpg";
import heroTrajesPreview from "../assets/heroes/previews/hero-trajes.mp4";

var CATEGORY_META = {
  lupa: { label: "Lupas", slug: "lupas", folder: "products-lupas", heroVideo: heroLupasVideo, heroVideoMobile: heroLupasVideoMobile, heroPoster: heroLupasPoster, heroPreview: heroLupasPreview, a: "#0f6fe0", b: "#020a18", particle: "#8fe0ff" },
  acessorios: { label: "Acessórios", slug: "acessorios", folder: "products-outros", heroVideo: heroAcessoriosVideo, heroVideoMobile: heroAcessoriosVideoMobile, heroPoster: heroAcessoriosPoster, heroPreview: heroAcessoriosPreview, a: "#2463c9", b: "#050b18", particle: "#7fb2ff" },
  relogios: { label: "Relógios", slug: "relogios", folder: "products-relogios", heroVideo: heroRelogiosVideo, heroVideoMobile: heroRelogiosVideoMobile, heroPoster: heroRelogiosPoster, heroPreview: heroRelogiosPreview, a: "#3d6fb8", b: "#04101f", particle: "#cfe4ff" },
  perfumes: { label: "Perfumes", slug: "perfumes", folder: "products-perfumes", heroVideo: heroPerfumesVideo, heroVideoMobile: heroPerfumesVideoMobile, heroPoster: heroPerfumesPoster, heroPreview: heroPerfumesPreview, a: "#d4520f", b: "#150500", particle: "#ffc98f" },
  trajes: { label: "Trajes", slug: "trajes", folder: "products-moletons", heroVideo: heroTrajesVideo, heroVideoMobile: heroTrajesVideoMobile, heroPoster: heroTrajesPoster, heroPreview: heroTrajesPreview, a: "#c2410f", b: "#120500", particle: "#ff8c42" }
};

var globs = {
  lupa: import.meta.glob("../assets/products-lupas/*.{png,jpg,jpeg,webp}", { eager: true, query: "?url", import: "default" }),
  relogios: import.meta.glob("../assets/products-relogios/*.{png,jpg,jpeg,webp}", { eager: true, query: "?url", import: "default" }),
  perfumes: import.meta.glob("../assets/products-perfumes/*.{png,jpg,jpeg,webp}", { eager: true, query: "?url", import: "default" }),
  trajes: import.meta.glob("../assets/products-moletons/*.{png,jpg,jpeg,webp}", { eager: true, query: "?url", import: "default" }),
  acessorios: import.meta.glob("../assets/products-outros/*.{png,jpg,jpeg,webp}", { eager: true, query: "?url", import: "default" })
};

// versões com fundo removido (scripts/remove-backgrounds.mjs) — só existem
// pra imagens aprovadas (needs_manual_mask não gera arquivo processado, então
// cai no fallback do original automaticamente, nunca quebra)
var processedGlobs = {
  lupa: import.meta.glob("../assets/products-processed/products-lupas/*.png", { eager: true, query: "?url", import: "default" }),
  relogios: import.meta.glob("../assets/products-processed/products-relogios/*.png", { eager: true, query: "?url", import: "default" }),
  perfumes: import.meta.glob("../assets/products-processed/products-perfumes/*.png", { eager: true, query: "?url", import: "default" }),
  trajes: import.meta.glob("../assets/products-processed/products-moletons/*.png", { eager: true, query: "?url", import: "default" }),
  acessorios: import.meta.glob("../assets/products-processed/products-outros/*.png", { eager: true, query: "?url", import: "default" })
};
function stem(key) { return key.replace(/^.*\//, "").replace(/\.[^.]+$/, ""); }

// Preços (centavos) — referência de mercado levantada em 08/10/2026:
// lupas = linha padrão da Trance Lupas (trancelupass.com.br, R$197,00);
// chapéus = Bucket/Chapéu da Trance (R$194,00). Categorias sem referência
// nos sites que o cliente indicou ficam null → "Consultar disponibilidade".
// Manter em sincronia com public.product_prices (migration 0003), que é a
// fonte usada pelo servidor ao registrar pedido.
var CATEGORY_PRICE_CENTS = { lupa: 19700, acessorios: null, relogios: null, perfumes: null, trajes: null };
var FILE_PRICE_CENTS = {
  "WhatsApp Image 2026-08-28 at 15.22.11 (2)": 19400, // chapéu bege
  "WhatsApp Image 2026-08-28 at 15.22.12 (1)": 40000, // colete (detalhe) — preço do cliente, 08/10/2026
  "WhatsApp Image 2026-08-28 at 15.22.14 (1)": 40000, // colete
  "WhatsApp Image 2026-08-28 at 15.22.15 (2)": 19400, // chapéu preto
  "ChatGPT Image 28 de ago. de 2026, 16_10_26 (10)": 22000 // relógio Minute Machine (preço do cliente, 08/10/2026)
};

window.SG_CATALOG = Object.keys(CATEGORY_META).map(function (categoryId) {
  var meta = CATEGORY_META[categoryId];
  var processedByStem = {};
  Object.keys(processedGlobs[categoryId]).forEach(function (key) {
    processedByStem[stem(key)] = processedGlobs[categoryId][key];
  });
  var keys = Object.keys(globs[categoryId]).sort();
  var items = keys.map(function (key, i) {
    var url = processedByStem[stem(key)] || globs[categoryId][key];
    var n = String(i + 1).padStart(2, "0");
    var priceCents = FILE_PRICE_CENTS[stem(key)] || CATEGORY_PRICE_CENTS[categoryId] || null;
    return {
      id: categoryId + "-" + n,
      category: categoryId,
      categoryLabel: meta.label,
      name: meta.label.replace(/s$/, "") + " — Peça " + n,
      images: [url],
      frameColor: meta.label,
      lensColor: "—",
      material: "—",
      tag: "CATÁLOGO",
      desc: "peça " + n + " do catálogo " + meta.label.toLowerCase(),
      alt: meta.label + " Street Goose 034 — peça " + n,
      price: priceCents,
      priceLabel: priceCents ? window.SG.formatPrice(priceCents) : "Consultar disponibilidade",
      available: true,
      curated: false
    };
  });
  return {
    id: categoryId, label: meta.label, slug: meta.slug, folder: meta.folder,
    heroVideo: meta.heroVideo, heroVideoMobile: meta.heroVideoMobile, heroPoster: meta.heroPoster, heroPreview: meta.heroPreview,
    a: meta.a, b: meta.b, particle: meta.particle,
    count: items.length, items: items
  };
});

// favoritar/adicionar à sacola nos itens de categoria usam o mesmo sistema
// genérico (wishlist.js/cart.js), que lê window.SG_PRODUCTS por id — concatenar
// em vez de duplicar essa lógica num sistema paralelo só para o catálogo
window.SG_PRODUCTS = (window.SG_PRODUCTS || []).concat(
  window.SG_CATALOG.reduce(function (acc, cat) { return acc.concat(cat.items); }, [])
);
// mesma normalização comercial honesta de data.js — precisa rodar de novo
// porque os itens do catálogo chegam depois daquele forEach já ter passado
window.SG_PRODUCTS.forEach(function (p) {
  p.sku = p.sku || "SG034-" + p.id.toUpperCase();
  p.price = p.price || null;
  p.priceLabel = p.priceLabel || "Consultar disponibilidade";
  p.inventoryStatus = p.inventoryStatus || (p.available === false ? "outOfStock" : "inStock");
});

window.SG_CATALOG_BY_SLUG = {};
window.SG_CATALOG.forEach(function (cat) { window.SG_CATALOG_BY_SLUG[cat.slug] = cat; });

export {};
