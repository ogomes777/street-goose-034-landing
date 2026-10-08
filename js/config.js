/* Street Goose 034 — configuração central de loja/contato.
   Nenhum dado comercial real (telefone, CNPJ, gateway) é inventado aqui —
   os campos ficam com placeholder explícito até serem preenchidos de verdade. */
window.SG_STORE_CONFIG = {
  currency: "BRL",
  locale: "pt-BR",
  freeShippingThreshold: null // defina um valor em centavos quando a política existir
};

window.SG_CONTACT_CONFIG = {
  whatsappNumber: "", // formato E.164 sem "+", ex: "5534999999999" — preencher quando disponível
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
