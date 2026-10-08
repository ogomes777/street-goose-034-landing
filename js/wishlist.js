/* Street Goose 034 — favoritos, persistidos, sincronizados em qualquer
   botão de coração da página (grid, quick view, shape lab). */
(function () {
  "use strict";

  var STORAGE_KEY = "sgWishlist";
  var products = window.SG_PRODUCTS || [];
  var countEl = document.querySelector("[data-wishlist-count]");
  var favoritesBody = document.querySelector("[data-favorites-body]");
  var favoritesBtn = document.querySelector(".favorites-btn");

  function load() {
    try {
      var raw = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
      return Array.isArray(raw) ? raw.filter(function (id) { return products.some(function (p) { return p.id === id; }); }) : [];
    } catch (e) { return []; }
  }

  var ids = load();

  function persist() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(ids)); } catch (e) {}
  }

  function isFavorite(id) { return ids.indexOf(id) !== -1; }

  function syncButtons() {
    document.querySelectorAll("[data-favorite-toggle]").forEach(function (btn) {
      var id = btn.getAttribute("data-favorite-toggle");
      var active = isFavorite(id);
      btn.classList.toggle("is-active", active);
      btn.setAttribute("aria-pressed", active ? "true" : "false");
      btn.setAttribute("aria-label", (active ? "Remover dos favoritos: " : "Favoritar: ") + id);
    });
    if (countEl) {
      countEl.textContent = String(ids.length);
      countEl.hidden = ids.length === 0;
    }
    if (favoritesBtn) favoritesBtn.classList.toggle("has-items", ids.length > 0);
    renderDrawer();
    document.dispatchEvent(new CustomEvent("sg:wishlist-change"));
  }

  function renderDrawer() {
    if (!favoritesBody) return;
    var favProducts = ids.map(function (id) { return products.find(function (p) { return p.id === id; }); }).filter(Boolean);
    if (!favProducts.length) {
      favoritesBody.innerHTML =
        '<div class="cart-empty"><p class="cart-empty-title">NENHUM FAVORITO AINDA.</p>' +
        '<p>Toque no coração de uma peça pra guardar aqui.</p>' +
        '<a class="btn btn-primary" href="#colecao" data-close-favorites>Explorar coleção</a></div>';
      return;
    }
    favoritesBody.innerHTML = favProducts.map(function (p) {
      return (
        '<div class="cart-item" data-favorite-item="' + p.id + '">' +
        '<img src="' + p.images[0] + '" alt="' + p.name + '" width="72" height="72">' +
        '<div class="cart-item-info"><h4>' + p.name + "</h4><p class=\"cart-item-meta\">" + p.frameColor + "</p>" +
        '<p class="cart-item-price" data-price-for="' + p.id + '">' + p.priceLabel + "</p></div>" +
        '<div class="cart-item-actions">' +
        '<button class="round-btn" aria-label="Adicionar ' + p.name + ' à sacola" data-add-to-cart="' + p.id + '">+</button>' +
        '<button class="cart-item-remove" data-favorite-toggle="' + p.id + '">Remover</button>' +
        "</div></div>"
      );
    }).join("");
  }

  function toggle(id) {
    var p = products.find(function (x) { return x.id === id; });
    if (!p) return;
    var idx = ids.indexOf(id);
    if (idx === -1) {
      ids.push(id);
      if (window.SG.toast) window.SG.toast("SALVO NOS FAVORITOS — " + p.name.toUpperCase());
    } else {
      ids.splice(idx, 1);
    }
    persist();
    syncButtons();
  }

  window.SG.wishlist = {
    toggle: toggle,
    isFavorite: isFavorite,
    count: function () { return ids.length; },
    getItems: function () { return ids.map(function (id) { return products.find(function (p) { return p.id === id; }); }).filter(Boolean); }
  };

  document.addEventListener("click", function (e) {
    var btn = e.target.closest("[data-favorite-toggle]");
    if (!btn) return;
    e.preventDefault();
    e.stopPropagation();
    var id = btn.getAttribute("data-favorite-toggle");
    if (window.SG.auth) window.SG.auth.requireAuth({ type: "favorite", payload: { productId: id } });
    else toggle(id);
  });

  // produtos renderizados depois (grid, shape rail, catálogo de categoria
  // montado sob demanda pelo router) precisam re-sincronizar
  var grid = document.querySelector("[data-product-grid]");
  var rail = document.querySelector("[data-shape-rail]");
  var categoryPage = document.querySelector("[data-category-page]");
  [grid, rail, categoryPage].forEach(function (node) {
    if (!node || !("MutationObserver" in window)) return;
    new MutationObserver(syncButtons).observe(node, { childList: true, subtree: true });
  });

  syncButtons();
})();

export {};
