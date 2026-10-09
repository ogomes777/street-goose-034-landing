/* Street Goose 034 — configuração central de loja/contato.
   Nenhum dado comercial real (telefone, CNPJ, gateway) é inventado aqui —
   os campos ficam com placeholder explícito até serem preenchidos de verdade. */
import { escapeHtml } from "../src/lib/html.ts";
window.SG_STORE_CONFIG = {
  currency: "BRL",
  locale: "pt-BR",
  freeShippingThreshold: null // defina um valor em centavos quando a política existir
};

window.SG_CONTACT_CONFIG = {
  whatsappNumber: "553497281423", // +55 34 9728-1423 (cliente, 08/10/2026) — formato E.164 sem "+"
  whatsappFallbackUrl: "https://wa.me/",
  instagramHandle: "",
  instagramFallbackUrl: "https://instagram.com/"
};

window.SG_PAYMENT_CONFIG = {
  // Nenhum gateway conectado ainda. createCheckoutSession/createPixPayment
  // ficam prontos para receber uma integração real sem mudar a UI.
  provider: null
};

window.SG.formatPrice = function (cents) {
  if (typeof cents !== "number") return null;
  return new Intl.NumberFormat(window.SG_STORE_CONFIG.locale, {
    style: "currency", currency: window.SG_STORE_CONFIG.currency
  }).format(cents / 100);
};

// Subtotal da sacola: soma o que tem preço; se algum item não tem, avisa
// que o restante é confirmado no atendimento em vez de mostrar total falso.
window.SG.subtotalLabel = function (rows) {
  var known = 0, unknown = 0;
  rows.forEach(function (r) {
    if (typeof r.product.price === "number") known += r.product.price * r.qty;
    else unknown += r.qty;
  });
  if (!unknown) return window.SG.formatPrice(known);
  if (!known) return "Consultar no atendimento";
  return window.SG.formatPrice(known) + " + itens a consultar";
};

// Escapa texto vindo de usuário/banco antes de entrar em innerHTML (apelido,
// legenda, nome de item de pedido, busca, avaliação). Sem isso, qualquer
// "<img onerror=...>" salvo no banco executaria no navegador de quem visse.
// mesma função de src/lib/html.ts (coberta por teste), exposta pro código legado
window.SG.esc = escapeHtml;

// status do pedido como o cliente lê (mesmos nomes do painel /admin)
window.SG.orderStatusLabel = function (status) {
  return ({ pending_payment: "Aguardando pagamento", paid: "Pago", fulfilled: "Enviado", cancelled: "Cancelado", refunded: "Reembolsado" })[status] || status;
};

// link de WhatsApp perguntando preço/disponibilidade de uma peça específica
window.SG.waProductLink = function (product) {
  return window.SG.waLink("Olá! Quero saber o preço e a disponibilidade de " + product.name + " (" + (product.sku || product.id) + ") que vi no site da Street Goose 034.");
};

window.SG.waLink = function (message) {
  var cfg = window.SG_CONTACT_CONFIG;
  var base = cfg.whatsappNumber ? "https://wa.me/" + cfg.whatsappNumber : cfg.whatsappFallbackUrl;
  return base + (message ? "?text=" + encodeURIComponent(message) : "");
};

document.querySelectorAll("[data-contact-whatsapp]").forEach(function (el) {
  el.setAttribute("href", window.SG.waLink());
  el.setAttribute("target", "_blank");
  el.setAttribute("rel", "noopener");
});
document.querySelectorAll("[data-contact-instagram]").forEach(function (el) {
  var cfg = window.SG_CONTACT_CONFIG;
  el.setAttribute("href", cfg.instagramHandle ? "https://instagram.com/" + cfg.instagramHandle : cfg.instagramFallbackUrl);
  el.setAttribute("target", "_blank");
  el.setAttribute("rel", "noopener");
});

export {};
