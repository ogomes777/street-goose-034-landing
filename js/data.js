/* Street Goose 034 — catálogo e campanhas
   Fonte única de verdade para produtos e hero slides. */

// A grade genérica de óculos (SG SELECT/ARCHIVE) que ficava aqui usava
// assets/products/web/ — pasta removida a pedido explícito (não é perda
// acidental, foi decisão editorial: o catálogo real agora vive em
// catalog.js, alimentado pelas pastas products-lupas/-moletons/-outros/
// -perfumes/-relogios). Array vazio, não removido, porque products.js,
// wishlist.js, cart.js e reviews.js leem window.SG_PRODUCTS || [].
window.SG_PRODUCTS = [];

// Campos comerciais derivados — sem preço real definido ainda, então a UI
// mostra estado honesto ("consultar") em vez de inventar valor.
window.SG_PRODUCTS.forEach(function (p) {
  p.sku = p.sku || "SG034-" + p.id.toUpperCase();
  p.price = p.price || null;
  p.priceLabel = p.priceLabel || "Consultar disponibilidade";
  p.inventoryStatus = p.inventoryStatus || (p.available === false ? "outOfStock" : "inStock");
});

window.SG_HERO_SLIDES = [
  {
    id: "film", type: "video", accent: "#FF5A00",
    image: "/assets/heroes/web/hero-poster.jpg",
    eyebrow: "STREET GOOSE 034 / FILM",
    heading: "Seu visual<br><em>chega antes.</em>",
    lead: "Rua, performance e design no mesmo frame. Curadoria Street Goose 034.",
    ctaPrimary: { label: "Explorar coleção", href: "#colecao" },
    ctaSecondary: { label: "Entender a Street Goose →", href: "#manifesto" }
  },
  {
    id: "curadoria-01", type: "image", accent: "#FF5A00",
    image: "/assets/heroes/web/curadoria-01.webp",
    eyebrow: "STREET GOOSE 034 / CURADORIA 01",
    heading: "Não é só óculos.<br><em>É presença.</em>",
    lead: "Peça certa, postura certa. A seleção que fecha o look sem pedir licença.",
    ctaPrimary: { label: "Ver curadoria", href: "#colecao" }
  },
  {
    id: "performance-run", type: "image", accent: "#FF7A00",
    image: "/assets/heroes/web/performance-run.webp",
    eyebrow: "SG / PERFORMANCE 034",
    heading: "Preciso pra quem<br><em>não para.</em>",
    lead: "Encaixe firme, lente que responde e visual que acompanha o ritmo.",
    ctaPrimary: { label: "Ver performance", href: "#performance" }
  },
  {
    id: "night-mode", type: "image", accent: "#8B5CF6",
    image: "/assets/heroes/web/night-mode.webp",
    focus: "70% center",
    eyebrow: "STREET GOOSE 034 / NIGHT MODE",
    heading: "Menos ruído.<br><em>Mais assinatura.</em>",
    lead: "Quando a armação encaixa de verdade, o resto do visual acompanha.",
    ctaPrimary: { label: "Escolher a próxima", href: "#colecao" }
  }
];

export {};
