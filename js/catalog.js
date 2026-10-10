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
import heroLupasVideo from "../assets/heroes/loop/hero-lupas.mp4";
import heroLupasVideoMobile from "../assets/heroes/loop-mobile/hero-lupas.mp4";
import heroLupasPoster from "../assets/heroes/loop/hero-lupas-poster.jpg";
import heroLupasPreview from "../assets/heroes/previews/hero-lupas.mp4";
import heroAcessoriosVideo from "../assets/heroes/loop/hero-acessorios.mp4";
import heroAcessoriosVideoMobile from "../assets/heroes/loop-mobile/hero-acessorios.mp4";
import heroAcessoriosPoster from "../assets/heroes/loop/hero-acessorios-poster.jpg";
import heroAcessoriosPreview from "../assets/heroes/previews/hero-acessorios.mp4";
import heroRelogiosVideo from "../assets/heroes/loop/hero-relogios.mp4";
import heroRelogiosVideoMobile from "../assets/heroes/loop-mobile/hero-relogios.mp4";
import heroRelogiosPoster from "../assets/heroes/loop/hero-relogios-poster.jpg";
import heroRelogiosPreview from "../assets/heroes/previews/hero-relogios.mp4";
import heroPerfumesVideo from "../assets/heroes/loop/hero-perfumes.mp4";
import heroPerfumesVideoMobile from "../assets/heroes/loop-mobile/hero-perfumes.mp4";
import heroPerfumesPoster from "../assets/heroes/loop/hero-perfumes-poster.jpg";
import heroPerfumesPreview from "../assets/heroes/previews/hero-perfumes.mp4";
import heroTrajesVideo from "../assets/heroes/loop/hero-trajes.mp4";
import heroTrajesVideoMobile from "../assets/heroes/loop-mobile/hero-trajes.mp4";
import heroTrajesPoster from "../assets/heroes/loop/hero-trajes-poster.jpg";
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

// miniaturas 160px (scripts/make-thumbs.mjs) — onde a peça aparece pequena,
// ex.: seletor "Peça no visual" da comunidade. ?no-inline: viram arquivos
// (carregados só quando aparecem), não base64 dentro deste JS de boot.
var thumbGlobs = {
  lupa: import.meta.glob("../assets/thumbs/products-lupas/*.webp", { eager: true, query: "?no-inline", import: "default" }),
  relogios: import.meta.glob("../assets/thumbs/products-relogios/*.webp", { eager: true, query: "?no-inline", import: "default" }),
  perfumes: import.meta.glob("../assets/thumbs/products-perfumes/*.webp", { eager: true, query: "?no-inline", import: "default" }),
  trajes: import.meta.glob("../assets/thumbs/products-moletons/*.webp", { eager: true, query: "?no-inline", import: "default" }),
  acessorios: import.meta.glob("../assets/thumbs/products-outros/*.webp", { eager: true, query: "?no-inline", import: "default" })
};
var THUMB_BY_URL = {};
/** miniatura de uma foto do catálogo (URL da foto cheia → URL da miniatura); null se não houver */
window.SG.thumbFor = function (url) { return THUMB_BY_URL[url] || null; };
function stem(key) { return key.replace(/^.*\//, "").replace(/\.[^.]+$/, ""); }

// Preços (centavos) — referência de mercado levantada em 08/10/2026:
// lupas = linha padrão da Trance Lupas (trancelupass.com.br, R$197,00);
// chapéus = Bucket/Chapéu da Trance (R$194,00). Categorias sem referência
// nos sites que o cliente indicou ficam null → "Consultar disponibilidade".
// FALLBACK: a fonte real é public.product_prices, editável em /admin →
// Preços (js/price-sync.js aplica por cima no boot). Estes mapas só valem
// enquanto o banco não respondeu ou sem Supabase configurado.
// trajes = blusas de frio/moletons e relógios (Minute Machine e os
// redondos) = R$220,00, informados pelo cliente.
var CATEGORY_PRICE_CENTS = { lupa: 19700, acessorios: null, relogios: 22000, perfumes: null, trajes: 22000 };
var FILE_PRICE_CENTS = {
  "WhatsApp Image 2026-08-28 at 15.22.09 (1)": 80000, // mochila (3 fotos, ver PRODUCT_GROUPS) — preço do cliente, 08/10/2026
  "WhatsApp Image 2026-08-28 at 15.22.11 (2)": 19400, // chapéu bege
  "WhatsApp Image 2026-08-28 at 15.22.12 (1)": 40000, // colete (detalhe) — preço do cliente, 08/10/2026
  "WhatsApp Image 2026-08-28 at 15.22.14 (1)": 40000, // colete
  "WhatsApp Image 2026-08-28 at 15.22.15 (2)": 19400 // chapéu preto
};

// Fotos diferentes do MESMO produto: a primeira (chave) vira o produto e as
// demais entram como fotos extras dele, em vez de virar peças separadas.
// O id continua vindo da posição original do arquivo (estável para sacola,
// favoritos e public.product_prices); só a numeração exibida é recontada.
// Categorias em que cada peça tem preço diferente (cliente, 08/10/2026):
// sem preço fixo no site, o card leva direto pro WhatsApp com a peça.
var CONSULT_WHATSAPP = { perfumes: true };

var PRODUCT_GROUPS = {
  // mochila: frente + duas laterais
  "WhatsApp Image 2026-08-28 at 15.22.09 (1)": ["WhatsApp Image 2026-08-28 at 15.22.06 (1)", "WhatsApp Image 2026-08-28 at 15.22.13 (1)"]
};
// rótulo único para "tem preço" / "sem preço" — usado aqui no build e pelo
// price-sync.js quando o preço do banco chega (mesmos objetos de produto)
window.SG.priceLabelFor = function (category, cents) {
  if (typeof cents === "number" && cents > 0) return window.SG.formatPrice(cents);
  return CONSULT_WHATSAPP[category] ? "Consultar no WhatsApp" : "Consultar disponibilidade";
};
window.SG.setProductPrice = function (product, cents) {
  var priced = typeof cents === "number" && cents > 0;
  product.price = priced ? cents : null;
  // esgotada (marcada no painel) vence o preço: sem sacola e sem WhatsApp
  product.priceLabel = product.soldOut ? "Esgotado" : window.SG.priceLabelFor(product.category, cents);
  product.consultWhatsApp = !product.soldOut && !priced && !!CONSULT_WHATSAPP[product.category];
};

var GROUPED_EXTRA = {};
Object.keys(PRODUCT_GROUPS).forEach(function (primary) {
  PRODUCT_GROUPS[primary].forEach(function (extra) { GROUPED_EXTRA[extra] = primary; });
});

window.SG_CATALOG = Object.keys(CATEGORY_META).map(function (categoryId) {
  var meta = CATEGORY_META[categoryId];
  var processedByStem = {};
  Object.keys(processedGlobs[categoryId]).forEach(function (key) {
    processedByStem[stem(key)] = processedGlobs[categoryId][key];
  });
  var keys = Object.keys(globs[categoryId]).sort();
  var urlByStem = {};
  keys.forEach(function (key) { urlByStem[stem(key)] = processedByStem[stem(key)] || globs[categoryId][key]; });
  Object.keys(thumbGlobs[categoryId]).forEach(function (key) {
    var full = urlByStem[stem(key)];
    if (full) THUMB_BY_URL[full] = thumbGlobs[categoryId][key];
  });
  var shown = 0;
  var items = keys.map(function (key, i) {
    if (GROUPED_EXTRA[stem(key)]) return null;
    var url = urlByStem[stem(key)];
    var extraImages = (PRODUCT_GROUPS[stem(key)] || []).map(function (s2) { return urlByStem[s2]; }).filter(Boolean);
    var idNum = String(i + 1).padStart(2, "0");
    var n = String(++shown).padStart(2, "0");
    var priceCents = FILE_PRICE_CENTS[stem(key)] || CATEGORY_PRICE_CENTS[categoryId] || null;
    return {
      id: categoryId + "-" + idNum,
      category: categoryId,
      categoryLabel: meta.label,
      name: meta.label.replace(/s$/, "") + " — Peça " + n,
      images: [url].concat(extraImages),
      frameColor: meta.label,
      lensColor: "—",
      material: "—",
      tag: "CATÁLOGO",
      desc: "peça " + n + " do catálogo " + meta.label.toLowerCase(),
      alt: meta.label + " Street Goose 034 — peça " + n,
      price: priceCents,
      priceLabel: window.SG.priceLabelFor(categoryId, priceCents),
      consultWhatsApp: !priceCents && !!CONSULT_WHATSAPP[categoryId],
      available: true,
      curated: false
    };
  }).filter(Boolean);
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

// ============================================================
// Camada do banco (public.products, editada em /admin → Produtos), aplicada
// por js/catalog-sync.js. Guarda o estado de fábrica de cada peça para poder
// reaplicar quantas vezes for preciso (cache local, depois o banco) e para
// "restaurar original". Arrays são alterados NO LUGAR: sacola, favoritos e
// busca guardaram a referência de SG_PRODUCTS / cat.items no boot.
// ============================================================
var FACTORY = {}; // id -> { name, desc, alt, images, order }
var ALL_BY_ID = {}; // id -> produto (inclusive ocultos e criados no painel)
var NON_CATALOG = window.SG_PRODUCTS.filter(function (p) { return !CATEGORY_META[p.category]; });
window.SG_CATALOG.forEach(function (cat) {
  cat.items.forEach(function (item, i) {
    FACTORY[item.id] = { name: item.name, desc: item.desc, alt: item.alt, images: item.images.slice(), order: (i + 1) * 10 };
    item.hidden = false;
    item.soldOut = false;
    item.isCustom = false;
    item.order = (i + 1) * 10;
    ALL_BY_ID[item.id] = item;
  });
});

function makeCustomProduct(id, category) {
  return {
    id: id, category: category, categoryLabel: CATEGORY_META[category].label, name: "", images: [],
    frameColor: CATEGORY_META[category].label, lensColor: "—", material: "—", tag: "NOVO", desc: "", alt: "",
    price: null, priceLabel: "", consultWhatsApp: false, available: true, curated: false,
    sku: "SG034-" + id.toUpperCase(), inventoryStatus: "inStock", isCustom: true, hidden: false, soldOut: false, order: 0
  };
}

// rows: linhas de public.products; storageUrl(path): URL pública no bucket
window.SG.applyCatalogOverlay = function (rows, storageUrl) {
  var rowById = {};
  (rows || []).forEach(function (r) { if (r && r.id) rowById[r.id] = r; });
  Object.keys(rowById).forEach(function (id) {
    var r = rowById[id];
    if (!ALL_BY_ID[id] && r.is_custom && CATEGORY_META[r.category]) ALL_BY_ID[id] = makeCustomProduct(id, r.category);
  });

  var customSeq = 0;
  Object.keys(ALL_BY_ID).forEach(function (id) {
    var p = ALL_BY_ID[id];
    var factory = FACTORY[id];
    var r = rowById[id];
    p.gone = !factory && !r; // produto criado no painel e depois excluído
    if (p.gone) return;
    if (!factory && r && CATEGORY_META[r.category]) {
      p.category = r.category;
      p.categoryLabel = CATEGORY_META[r.category].label;
      p.frameColor = p.categoryLabel;
    }
    p.name = (r && r.name) || (factory ? factory.name : p.categoryLabel);
    p.desc = (r && r.description) || (factory ? factory.desc : "");
    p.alt = r && r.name ? r.name + " — Street Goose 034" : (factory ? factory.alt : p.name);
    var refs = r && r.images && r.images.length ? r.images : null;
    p.images = refs
      ? refs.map(function (ref) {
          var m = /^base:(\d+)$/.exec(ref);
          if (m) return factory ? factory.images[Number(m[1])] : null;
          return storageUrl ? storageUrl(ref) : null;
        }).filter(Boolean)
      : (factory ? factory.images.slice() : []);
    p.imageRefs = refs ? refs.slice() : (factory ? factory.images.map(function (_u, i) { return "base:" + i; }) : []);
    p.hidden = !!(r && r.hidden);
    p.soldOut = !!(r && r.sold_out);
    p.available = !p.soldOut;
    p.inventoryStatus = p.soldOut ? "outOfStock" : "inStock";
    p.order = r && typeof r.sort_order === "number" ? r.sort_order : (factory ? factory.order : 100000 + (customSeq++));
    // só posição (reordenar) não conta como "editado" no painel
    p.hasOverride = !!(r && (r.name || r.description || (r.images && r.images.length) || r.hidden || r.sold_out));
    window.SG.setProductPrice(p, p.price);
  });

  var visible = [];
  window.SG_CATALOG.forEach(function (cat) {
    var list = Object.keys(ALL_BY_ID).map(function (id) { return ALL_BY_ID[id]; })
      .filter(function (p) { return p.category === cat.id && !p.gone && !p.hidden && p.images.length; })
      .sort(function (a, b) { return a.order - b.order || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0); });
    cat.items.length = 0;
    Array.prototype.push.apply(cat.items, list);
    cat.count = list.length;
    visible = visible.concat(list);
  });
  window.SG_PRODUCTS.length = 0;
  Array.prototype.push.apply(window.SG_PRODUCTS, NON_CATALOG.concat(visible));
};

// painel: todas as peças de uma categoria, inclusive ocultas, na ordem do site
window.SG.catalogAll = function (categoryId) {
  return Object.keys(ALL_BY_ID).map(function (id) { return ALL_BY_ID[id]; })
    .filter(function (p) { return !p.gone && p.category === categoryId; })
    .sort(function (a, b) { return a.order - b.order || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0); });
};
window.SG.catalogFactory = function (id) { return FACTORY[id] || null; };

export {};
