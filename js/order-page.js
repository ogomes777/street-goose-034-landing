/* Street Goose 034 — /pedido/:id. */
export function mountOrderPage(root, params, onClose) {
  function t(key) { return (window.SG.i18n && window.SG.i18n.t(key)) || key; }

  root.innerHTML =
    '<div class="app-page-head"><h1>Pedido</h1>' +
    '<button class="app-page-close" type="button" data-app-close aria-label="' + t("common.close") + '"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg></button></div>' +
    '<div class="app-page-body" data-order-body><div class="app-page-loading">' + t("common.loading") + "</div></div>";

  var bodyEl = root.querySelector("[data-order-body]");

  async function render() {
    var mod = await import("../src/lib/supabase.ts");
    var client = mod.supabase;
    if (!client) {
      bodyEl.innerHTML = '<div class="app-page-empty"><h2>' + t("auth.notConfigured") + "</h2></div>";
      return;
    }
    var { data: order, error: orderError } = await client.from("orders").select("*").eq("id", params.orderId).single();
    if (orderError || !order) {
      bodyEl.innerHTML = '<div class="app-page-empty"><h2>Pedido não encontrado.</h2></div>';
      return;
    }
    var { data: items } = await client.from("order_items").select("*").eq("order_id", order.id);
    var code = order.tracking_code || "";
    // código no padrão dos Correios (AA123456789BR) ganha link de rastreio
    var correios = /^[A-Z]{2}\d{9}[A-Z]{2}$/.test(code);
    bodyEl.innerHTML =
      '<div class="order-summary">' +
        "<p>Status: <b>" + window.SG.esc(window.SG.orderStatusLabel(order.status)) + "</b></p>" +
        (code
          ? "<p>Rastreio: <b>" + window.SG.esc(code) + "</b>" +
            (correios ? ' · <a href="https://rastreamento.correios.com.br/app/index.php?objeto=' + encodeURIComponent(code) + '" target="_blank" rel="noopener">rastrear</a>' : "") + "</p>"
          : "") +
        '<div class="order-items">' + (items || []).map(function (it) {
          return '<div class="order-item-row"><span>' + window.SG.esc(it.product_name) + " × " + window.SG.esc(it.qty) + "</span><span>" + window.SG.formatPrice(it.unit_price_cents * it.qty) + "</span></div>";
        }).join("") + "</div>" +
        (order.shipping_cents ? "<p>Frete: <b>" + window.SG.formatPrice(order.shipping_cents) + "</b></p>" : "") +
        (order.discount_cents ? "<p>Desconto: <b>− " + window.SG.formatPrice(order.discount_cents) + "</b></p>" : "") +
        "<p>Total: <b>" + (order.total_cents ? window.SG.formatPrice(order.total_cents) : t("common.consultAvailability")) + "</b></p>" +
      "</div>";
  }

  root.querySelector("[data-app-close]").addEventListener("click", onClose);
  function onKeydown(e) { if (e.key === "Escape") onClose(); }
  document.addEventListener("keydown", onKeydown);
  render();
  return function destroy() { document.removeEventListener("keydown", onKeydown); };
}
