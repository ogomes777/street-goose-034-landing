/* Street Goose 034 — carrinho real.
   Estado único, persistido em localStorage, renderiza o drawer e o contador
   do header. Abrir/fechar o drawer é responsabilidade do popup.js (mesmo
   modal manager de sempre); aqui só vive a lógica de carrinho. */
(function () {
  "use strict";

  var STORAGE_KEY = "sgCart";
  var products = window.SG_PRODUCTS || [];
  var badge = document.querySelector("[data-cart-count]");
  var body = document.querySelector("[data-cart-body]");
  var footer = document.querySelector("[data-cart-footer]");

  function loadState() {
    try {
      var raw = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
      if (!Array.isArray(raw)) return [];
      return raw.filter(function (row) {
        return row && typeof row.id === "string" && products.some(function (p) { return p.id === row.id; });
      }).map(function (row) {
        return { id: row.id, qty: Math.max(1, Math.min(99, parseInt(row.qty, 10) || 1)) };
      });
    } catch (e) { return []; }
  }

  var items = loadState();

  function persist() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(items)); } catch (e) {}
  }

  function findProduct(id) { return products.find(function (p) { return p.id === id; }); }

  function itemCount() { return items.reduce(function (n, r) { return n + r.qty; }, 0); }

  function addItem(id, qty) {
    qty = qty || 1;
    if (!findProduct(id)) return;
    var row = items.find(function (r) { return r.id === id; });
    if (row) row.qty = Math.min(99, row.qty + qty);
    else items.push({ id: id, qty: Math.min(99, qty) });
    persist();
    render();
  }

  function removeItem(id) {
    items = items.filter(function (r) { return r.id !== id; });
    persist();
    render();
  }

  function updateQty(id, qty) {
    var row = items.find(function (r) { return r.id === id; });
    if (!row) return;
    qty = parseInt(qty, 10);
    if (!isFinite(qty) || qty < 1) { removeItem(id); return; }
    row.qty = Math.min(99, qty);
    persist();
    render();
  }

  function clear() {
    items = [];
    persist();
    render();
  }

  function render() {
    if (badge) { badge.textContent = String(itemCount()); badge.hidden = itemCount() === 0; }

    if (body) {
      if (!items.length) {
        body.innerHTML =
          '<div class="cart-empty">' +
          '<p class="cart-empty-title">SUA SACOLA ESTÁ VAZIA.</p>' +
          '<p>A próxima peça está na coleção.</p>' +
          '<a class="btn btn-primary" href="#colecao" data-close-cart>Explorar coleção</a>' +
          "</div>";
      } else {
        body.innerHTML = items.map(function (row) {
          var p = findProduct(row.id);
          if (!p) return "";
          return (
            '<div class="cart-item" data-cart-item="' + p.id + '">' +
            '<img src="' + p.images[0] + '" alt="' + p.name + '" width="72" height="72">' +
            '<div class="cart-item-info">' +
            "<h4>" + p.name + "</h4>" +
            '<p class="cart-item-meta">' + p.frameColor + "</p>" +
            '<p class="cart-item-price">' + p.priceLabel + "</p>" +
            "</div>" +
            '<div class="cart-item-actions">' +
            '<div class="qty-stepper">' +
            '<button data-qty-minus aria-label="Diminuir quantidade">−</button>' +
            '<span>' + row.qty + "</span>" +
            '<button data-qty-plus aria-label="Aumentar quantidade">+</button>' +
            "</div>" +
            '<button class="cart-item-remove" data-remove aria-label="Remover ' + p.name + '">Remover</button>' +
            "</div></div>"
          );
        }).join("");
      }
    }

    if (footer) {
      footer.style.display = items.length ? "" : "none";
    }
    document.dispatchEvent(new CustomEvent("sg:cart-change"));
  }

  if (body) {
    body.addEventListener("click", function (e) {
      var row = e.target.closest("[data-cart-item]");
      if (!row) return;
      var id = row.getAttribute("data-cart-item");
      if (e.target.closest("[data-qty-plus]")) {
        var r1 = items.find(function (x) { return x.id === id; });
        updateQty(id, (r1 ? r1.qty : 0) + 1);
      } else if (e.target.closest("[data-qty-minus]")) {
        var r2 = items.find(function (x) { return x.id === id; });
        updateQty(id, (r2 ? r2.qty : 1) - 1);
      } else if (e.target.closest("[data-remove]")) {
        removeItem(id);
      }
    });
  }

  function addWithFeedback(id) {
    var p = findProduct(id);
    addItem(id, 1);
    if (window.SG.toast && p) window.SG.toast("ADICIONADO À SACOLA — " + p.name.toUpperCase());
    var pulseTarget = document.querySelector("[data-cart-count]");
    if (pulseTarget) {
      pulseTarget.classList.remove("is-pulsing");
      void pulseTarget.offsetWidth;
      pulseTarget.classList.add("is-pulsing");
    }
  }

  window.SG.cart = {
    addItem: addItem,
    addWithFeedback: addWithFeedback,
    removeItem: removeItem,
    updateQty: updateQty,
    clear: clear,
    itemCount: itemCount,
    getItems: function () {
      return items.map(function (r) { return { product: findProduct(r.id), qty: r.qty }; }).filter(function (r) { return r.product; });
    }
  };

  document.addEventListener("click", function (e) {
    var addBtn = e.target.closest("[data-add-to-cart]");
    if (addBtn) {
      e.preventDefault();
      var id = addBtn.getAttribute("data-add-to-cart");
      if (window.SG.auth) window.SG.auth.requireAuth({ type: "addToCart", payload: { productId: id, qty: 1 } });
      else addWithFeedback(id);
    }
  });

  render();
})();

export {};
