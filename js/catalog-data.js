/* Street Goose 034 — dados fixos do catálogo, sem dependência de navegador.
   Lidos por js/catalog.js (site) e pelo build (vite.config.ts), que grava a
   lista de peças no HTML de cada categoria. A ordem das categorias é a ordem
   do site; o id de cada peça vem da posição do arquivo na pasta. */
export const CATALOG_CATEGORIES = [
  { id: "lupa", slug: "lupas", label: "Lupas", folder: "products-lupas" },
  { id: "acessorios", slug: "acessorios", label: "Acessórios", folder: "products-outros" },
  { id: "relogios", slug: "relogios", label: "Relógios", folder: "products-relogios" },
  { id: "perfumes", slug: "perfumes", label: "Perfumes", folder: "products-perfumes" },
  { id: "trajes", slug: "trajes", label: "Trajes", folder: "products-moletons" },
];

// Fotos diferentes do MESMO produto: a primeira (chave) vira o produto e as
// demais entram como fotos extras dele, em vez de virar peças separadas.
export const PRODUCT_GROUPS = {
  // mochila: frente + duas laterais
  "WhatsApp Image 2026-08-28 at 15.22.09 (1)": ["WhatsApp Image 2026-08-28 at 15.22.06 (1)", "WhatsApp Image 2026-08-28 at 15.22.13 (1)"],
};

/** "Lupas", 1 → "Lupa — Peça 01" */
export function productName(label, n) {
  return label.replace(/s$/, "") + " — Peça " + String(n).padStart(2, "0");
}

export function productAlt(label, n) {
  return label + " Street Goose 034 — peça " + String(n).padStart(2, "0");
}
