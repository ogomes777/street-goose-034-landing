/* Street Goose 034 — catálogo: grid, filtros, quick view, shape lab rail */
(function () {
  "use strict";

  var products = window.SG_PRODUCTS || [];
  var grid = document.querySelector("[data-product-grid]");
  var filterRow = document.querySelector("[data-filter-row]");
  var shapeRail = document.querySelector("[data-shape-rail]");
  var currentFilter = "all";

  function cardMarkup(p) {
    return (
      '<article class="product-card" data-product-id="' + p.id + '" style="--accent:' + p.campaignAccent + '">' +
      '<span class="tag">' + p.tag + "</span>" +
      '<button class="favorite-btn" data-favorite-toggle="' + p.id + '" aria-pressed="false" aria-label="Favoritar ' + p.name + '"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 20.5s-7.5-4.6-10-9.4C.4 7.6 2 4 5.6 4 8 4 10 5.4 12 8c2-2.6 4-4 6.4-4C22 4 23.6 7.6 22 11.1 19.5 15.9 12 20.5 12 20.5z"/></svg></button>' +
      '<div class="product-media"><img src="' + p.images[0] + '" alt="' + p.name + " — " + p.frameColor + '" loading="lazy" width="900" height="900"></div>' +
      '<div class="product-info"><div><h3>' + p.name + "</h3><p>" + p.desc + '</p><p class="product-price">' + p.priceLabel + '</p></div>' +
      '<div class="product-info-actions">' +
      '<button class="round-btn" aria-label="Adicionar ' + p.name + ' à sacola" data-add-to-cart="' + p.id + '">+</button>' +
      '<button class="round-btn" aria-label="Abrir ' + p.name + '" data-open-quickview="' + p.id + '">↗</button>' +
      "</div></div></article>"
    );
  }

  function renderGrid() {
    if (!grid) return;
    var list = products.filter(function (p) { return currentFilter === "all" || p.category === currentFilter; });
    grid.innerHTML = list.map(cardMarkup).join("") ||
      '<div class="product-card product-card--empty">Nenhuma peça nessa categoria por enquanto.</div>';
    bindCardInteractions();
    if (window.SG.hasGSAP && !window.SG.prefersReducedMotion()) {
      window.gsap.fromTo(grid.children, { opacity: 0, y: 22 },
        { opacity: 1, y: 0, duration: window.SG.motion.base, ease: window.SG.motion.easeOut, stagger: 0.06 });
    }
  }

  function bindCardInteractions() {
    var cards = grid.querySelectorAll(".product-card[data-product-id]");
    cards.forEach(function (card) {
      var img = card.querySelector("img");
      card.addEventListener("pointermove", function (e) {
        if (window.SG.perfTier === "low") return;
        var r = card.getBoundingClientRect();
        var x = (e.clientX - r.left) / r.width - 0.5;
        var y = (e.clientY - r.top) / r.height - 0.5;
        img.style.transform = "rotate(" + (x * 3) + "deg) translate(" + (x * 8) + "px," + (y * 8) + "px) scale(1.02)";
      });
      card.addEventListener("pointerleave", function () { img.style.transform = ""; });
      card.addEventListener("click", function (e) {
        if (e.target.closest("[data-open-quickview], [data-favorite-toggle], [data-add-to-cart]")) return;
        openQuickView(card.getAttribute("data-product-id"));
      });
    });
  }

  // delegado no document: cobre botões de quick view fora do grid também
  // (ex: CTA do Featured Drop), sem precisar rebind a cada render
  document.addEventListener("click", function (e) {
    var btn = e.target.closest("[data-open-quickview]");
    if (!btn) return;
    e.preventDefault();
    e.stopPropagation();
    openQuickView(btn.getAttribute("data-open-quickview"));
  });

  if (filterRow) {
    filterRow.addEventListener("click", function (e) {
      var chip = e.target.closest(".filter-chip");
      if (!chip) return;
      filterRow.querySelectorAll(".filter-chip").forEach(function (c) { c.classList.remove("is-active"); });
      chip.classList.add("is-active");
      currentFilter = chip.getAttribute("data-filter");
      renderGrid();
    });
  }

  function openQuickView(id) {
    var p = products.find(function (x) { return x.id === id; });
    if (!p || !window.SG.openQuickView) return;
    window.SG.openQuickView(p);
  }

  // Shape Lab rail — peças da categoria archive em fundo claro.
  // Produtos que já têm papel de hero em outra seção (role definido em
  // data.js: orbit, scrollHero, featured...) ficam fora daqui — não repetir
  // a mesma peça em dois momentos de destaque da landing.
  function renderShapeRail() {
    if (!shapeRail) return;
    var archive = products.filter(function (p) { return p.category === "archive" && !p.role; });
    shapeRail.innerHTML = archive.map(function (p) {
      return (
        '<article class="shape-card" data-product-id="' + p.id + '">' +
        '<img src="' + p.images[0] + '" alt="' + p.name + '" loading="lazy" width="900" height="900">' +
        "<h3>" + p.name + "</h3><p>" + p.frameColor + "</p></article>"
      );
    }).join("");
    shapeRail.querySelectorAll(".shape-card").forEach(function (card) {
      card.addEventListener("click", function () { openQuickView(card.getAttribute("data-product-id")); });
    });
  }

  renderGrid();
  renderShapeRail();
})();

export {};
