/* Street Goose 034 — preço do banco por cima do catálogo.
   catalog.js monta os produtos com os mapas locais (fallback); aqui o preço
   de public.product_prices é aplicado nos MESMOS objetos de produto que
   sacola, favoritos, quickview e checkout já usam — tudo que renderizar
   depois já sai certo. O que já estava desenhado na tela é atualizado no
   lugar: elementos com data-price-for="<id>" (preço da peça) e
   data-cart-subtotal (subtotal da sacola). Evento "sg:prices" avisa quem
   precisa redesenhar mais que texto (ex.: CTA de WhatsApp na categoria).
   Último preço visto fica em cache local para quem volta não ver o valor
   do fallback piscar antes da resposta do banco. */
(function () {
  "use strict";

  var CACHE_KEY = "sgPrices";
  var products = window.SG_PRODUCTS || [];
  var lastPrices = null;

  function apply(prices) {
    lastPrices = prices;
    products.forEach(function (p) {
      if (!p.category) return; // só itens do catálogo têm linha em product_prices
      var cents = Object.prototype.hasOwnProperty.call(prices, p.id) ? prices[p.id] : null;
      window.SG.setProductPrice(p, cents);
    });
  }

  function paint() {
    var byId = {};
    products.forEach(function (p) { byId[p.id] = p; });
    document.querySelectorAll("[data-price-for]").forEach(function (el) {
      var p = byId[el.getAttribute("data-price-for")];
      if (p) el.textContent = p.priceLabel;
    });
    if (window.SG.cart) {
      var rows = window.SG.cart.getItems();
      document.querySelectorAll("[data-cart-subtotal]").forEach(function (el) {
        el.textContent = window.SG.subtotalLabel(rows);
      });
    }
    window.dispatchEvent(new CustomEvent("sg:prices"));
  }

  try {
    var cached = JSON.parse(localStorage.getItem(CACHE_KEY) || "null");
    if (cached && cached.v === 1 && cached.prices && typeof cached.prices === "object") apply(cached.prices);
  } catch (e) {}

  async function refresh() {
    var mod = await import("../src/services/PriceService.ts");
    var prices = await mod.PriceService.fetchAll();
    if (!prices) return false; // sem resposta: mantém cache/fallback, nunca zera preço
    apply(prices);
    try { localStorage.setItem(CACHE_KEY, JSON.stringify({ v: 1, at: Date.now(), prices: prices })); } catch (e) {}
    paint();
    return true;
  }

  // catálogo mudou (produto novo, reexibido): reaplica o último preço conhecido
  window.addEventListener("sg:catalog", function () {
    if (lastPrices) { apply(lastPrices); paint(); }
  });

  window.SG.prices = { refresh: refresh };
  refresh().catch(function () {});
})();

export {};
