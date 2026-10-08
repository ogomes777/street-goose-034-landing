/* Street Goose 034 — página dedicada de sacola (/sacola). */
export function mountCartPage(root, _params, onClose) {
  function t(key) { return (window.SG.i18n && window.SG.i18n.t(key)) || key; }

  root.innerHTML =
    '<div class="app-page-head"><h1>' + t("cart.title") + '</h1>' +
    '<button class="app-page-close" type="button" data-app-close aria-label="' + t("common.close") + '"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg></button></div>' +
    '<div class="app-page-body" data-cart-page-body></div>';

  var bodyEl = root.querySelector("[data-cart-page-body]");


  function render() {
    var rows = window.SG.cart ? window.SG.cart.getItems() : [];
    if (!rows.length) {
      bodyEl.innerHTML =
        '<div class="app-page-empty"><h2>' + t("cart.empty.title") + "</h2>" +
        '<a class="btn btn-primary" href="/">' + t("cart.continueShopping") + "</a></div>";
      return;
    }
    bodyEl.innerHTML =
      '<div class="cart-page-grid">' +
        '<div class="cart-page-items">' + rows.map(function (r) {
          var p = r.product;
          return (
            '<div class="cart-item" data-cart-item="' + p.id + '">' +
              '<img src="' + window.SG.esc(p.images[0]) + '" alt="' + window.SG.esc(p.name) + '" width="56" height="56">' +
              '<div class="cart-item-info"><h4>' + window.SG.esc(p.name) + "</h4><p class=\"cart-item-meta\">" + (p.frameColor || "") + "</p>" +
              '<p class="cart-item-price" data-price-for="' + p.id + '">' + p.priceLabel + "</p></div>" +
              '<div class="cart-item-actions">' +
                '<div class="qty-stepper"><button data-qty-minus aria-label="Diminuir">-</button><span>' + r.qty + '</span><button data-qty-plus aria-label="Aumentar">+</button></div>' +
                '<button class="cart-item-remove" data-remove>' + t("favorites.remove") + "</button>" +
              "</div></div>"
          );
        }).join("") + "</div>" +
        '<div class="cart-page-summary">' +
          '<p class="cart-page-summary-row"><span>' + t("cart.subtotal") + '</span><b data-cart-subtotal>' + window.SG.subtotalLabel(rows) + "</b></p>" +
          '<button class="btn btn-primary" data-go-checkout>' + t("cart.checkout") + "</button>" +
          '<a class="text-link" href="/">' + t("cart.continueShopping") + "</a>" +
        "</div>" +
      "</div>";
  }

  bodyEl.addEventListener("click", function (e) {
    var row = e.target.closest("[data-cart-item]");
    if (row) {
      var id = row.getAttribute("data-cart-item");
      if (e.target.closest("[data-qty-plus]")) window.SG.cart.updateQty(id, 1);
      else if (e.target.closest("[data-qty-minus]")) window.SG.cart.updateQty(id, -1);
      else if (e.target.closest("[data-remove]")) window.SG.cart.removeItem(id);
      return;
    }
    if (e.target.closest("[data-go-checkout]") && window.SG_ROUTER) window.SG_ROUTER.navigate("/checkout");
  });

  root.querySelector("[data-app-close]").addEventListener("click", onClose);
  function onKeydown(e) { if (e.key === "Escape") onClose(); }
  document.addEventListener("keydown", onKeydown);
  document.addEventListener("sg:cart-change", render);

  render();

  return function destroy() {
    document.removeEventListener("keydown", onKeydown);
    document.removeEventListener("sg:cart-change", render);
  };
}
