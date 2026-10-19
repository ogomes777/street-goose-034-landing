/* Street Goose 034 — camada de eventos (sem fornecedor).
   window.SG.track(nome, parâmetros) grava o evento em window.dataLayer, o
   formato padrão que Google Tag Manager / GA4 leem, e avisa quem escutar
   "sg:analytics". Nenhum script de terceiro é carregado aqui e nenhum dado
   sai do aparelho: quando a loja tiver um ID real de medição, o carregador
   entra junto com o aviso de consentimento (ver docs/launch/PLANO_EVENTOS.md).
   Cada interação gera um único evento: os cliques são escutados em um só
   lugar (abaixo) e os módulos só chamam track() para o que não é clique.
   Pedido registrado não é venda: a venda só existe quando a equipe confirma
   o pagamento no painel. */
(function () {
  "use strict";
  window.SG = window.SG || {};
  if (window.SG.track) return;
  window.dataLayer = window.dataLayer || [];

  function track(name, params) {
    var payload = Object.assign({ event: name }, params || {});
    window.dataLayer.push(payload);
    try { document.dispatchEvent(new CustomEvent("sg:analytics", { detail: payload })); } catch (e) {}
  }
  window.SG.track = track;

  // onde o clique aconteceu, em poucas palavras (sem dado pessoal)
  function placeOf(el) {
    if (el.closest("[data-category-page]")) return "category";
    if (el.closest("[data-app-page]")) return (document.querySelector("[data-app-page]").getAttribute("data-active-route") || "page").replace(/^\//, "");
    if (el.closest("[data-quickview]")) return "quickview";
    if (el.closest("[data-popup]")) return "popup";
    if (el.closest("footer")) return "footer";
    if (el.closest("[data-hero]")) return "hero";
    return "home";
  }

  document.addEventListener("click", function (e) {
    var t = e.target;
    if (!t || !t.closest) return;
    var cta = t.closest("[data-hero-cta]");
    if (cta) { track("hero_cta_click", { label: (cta.textContent || "").trim().slice(0, 60) }); return; }
    var wa = t.closest('a[href*="wa.me/"], a[href*="api.whatsapp.com/"]');
    if (wa) { track("whatsapp_click", { location: placeOf(wa) }); return; }
    var qv = t.closest("[data-open-quickview]");
    if (qv) { track("product_open", { product_id: qv.getAttribute("data-open-quickview"), location: placeOf(qv) }); return; }
    var checkout = t.closest("[data-go-checkout], [data-open-checkout]");
    if (checkout) track("begin_checkout", { location: placeOf(checkout) });
  }, true);

  // sacola e favoritos já avisam quando a peça entra de verdade (cart.js,
  // wishlist.js) — um evento por adição, nunca por clique repetido
  document.addEventListener("sg:store-intent", function (e) {
    var d = e.detail || {};
    if (d.kind === "cart") track("add_to_cart", { product_id: d.productId });
    else if (d.kind === "favorite") track("add_to_wishlist", { product_id: d.productId });
  });
})();

export {};
