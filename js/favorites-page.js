/* Street Goose 034 — página dedicada de favoritos (/favoritos).
   Reaproveita window.SG.wishlist (mesma fonte de verdade do drawer/coração
   nos cards) — não duplica estado. */
export function mountFavoritesPage(root, _params, onClose) {
  function t(key) { return (window.SG.i18n && window.SG.i18n.t(key)) || key; }

  root.innerHTML =
    '<div class="app-page-head"><h1 data-i18n="favorites.title">' + t("favorites.title") + '</h1>' +
    '<button class="app-page-close" type="button" data-app-close aria-label="' + t("common.close") + '"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg></button></div>' +
    '<div class="app-page-body" data-favorites-list></div>';

  var listEl = root.querySelector("[data-favorites-list]");

  function render() {
    var items = window.SG.wishlist ? window.SG.wishlist.getItems() : [];
    if (!items.length) {
      listEl.innerHTML =
        '<div class="app-page-empty"><h2>' + t("favorites.empty.title") + "</h2><p>" + t("favorites.empty.body") + "</p>" +
        '<a class="btn btn-primary" href="/">' + t("cart.continueShopping") + "</a></div>";
      return;
    }
    listEl.innerHTML = '<div class="fav-grid">' + items.map(function (p) {
      return (
        '<article class="fav-card">' +
          '<div class="fav-card-img" data-open-quickview="' + p.id + '"><img src="' + window.SG.esc(p.images[0]) + '" alt="' + window.SG.esc(p.name) + '" loading="lazy"></div>' +
          '<div class="fav-card-body"><h3>' + window.SG.esc(p.name) + "</h3><p data-price-for=\"" + p.id + "\">" + p.priceLabel + "</p>" +
          '<div class="fav-card-actions">' +
          '<button class="btn btn-primary" data-add-to-cart="' + p.id + '">' + t("favorites.moveToCart") + "</button>" +
          '<button class="text-link" data-favorite-toggle="' + p.id + '">' + t("favorites.remove") + "</button>" +
          "</div></div>" +
        "</article>"
      );
    }).join("") + "</div>";
  }

  root.querySelector("[data-app-close]").addEventListener("click", onClose);
  function onKeydown(e) { if (e.key === "Escape") onClose(); }
  document.addEventListener("keydown", onKeydown);

  // wishlist.js já delega clique global em [data-favorite-toggle] — só
  // precisamos re-renderizar esta lista quando o estado mudar
  document.addEventListener("sg:wishlist-change", render);

  render();

  return function destroy() {
    document.removeEventListener("keydown", onKeydown);
    document.removeEventListener("sg:wishlist-change", render);
  };
}
