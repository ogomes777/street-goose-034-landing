/* Street Goose 034 — modal manager único
   Uma fonte de verdade para abrir/fechar popup e quick view.
   Nunca reseta scroll, nunca reabre sozinho depois de fechado. */
(function () {
  "use strict";
  window.SG = window.SG || {};

  var popupEl = document.querySelector("[data-popup]");
  var qvEl = document.querySelector("[data-quickview]");
  var cartEl = document.querySelector("[data-cart]");
  var favoritesEl = document.querySelector("[data-favorites]");
  var checkoutEl = document.querySelector("[data-checkout]");
  var reviewEl = document.querySelector("[data-review-modal]");
  var zoomEl = document.querySelector("[data-zoom]");
  var scrollY = 0;
  var openEl = null;
  var lastFocused = null;
  // zoom é um overlay empilhado sobre o quick view (não substitui o modal
  // aberto) — fica de fora do openEl/lockScroll para não fechar o quick view
  // por baixo dele.
  var zoomOpen = false;
  var film = popupEl && popupEl.querySelector('[data-drop-film]');
  var filmTimer;
  var poseReady = false;
  var reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  var connection = navigator.connection;
  var lite = !!(connection && (connection.saveData || /(^|-)2g$/.test(connection.effectiveType))) ||
    (navigator.deviceMemory && navigator.deviceMemory <= 4) ||
    (navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 4);
  function settleFilm() {
    clearTimeout(filmTimer);
    if (!film) return;
    film.classList.remove('is-playing');
    film.classList.add('is-settled');
    if (poseReady) film.querySelector('[data-drop-pose]').classList.add('has-poses');
  }
  function startFilm() {
    if (!film) return;
    clearTimeout(filmTimer);
    film.classList.remove('is-playing', 'is-settled');
    film.classList.toggle('is-lite', !!lite);
    if (reducedMotion.matches) { settleFilm(); return; }
    // Restart only on an explicit new opening; the offer is usable from frame one.
    void film.offsetWidth;
    film.classList.add('is-playing');
    filmTimer = setTimeout(settleFilm, 4300);
  }
  if (film) {
    var sparks = film.querySelector('[data-drop-particles]');
    for (var s = 0; s < (lite ? 6 : 18); s++) {
      var spark = document.createElement('i');
      spark.style.cssText = 'left:' + (12 + (s * 37 % 78)) + '%;top:' + (30 + (s * 13 % 56)) + '%;--dx:' + ((s % 2 ? 1 : -1) * (18 + s * 3)) + 'px;--delay:' + (s * .045) + 's';
      sparks.append(spark);
    }
    // Optional pose sheet never blocks opening; neutral mascot is already in HTML.
    var poses = new Image();
    poses.fetchPriority = 'low';
    poses.onload = function () {
      poseReady = true;
      var pose = film.querySelector('[data-drop-pose]');
      pose.style.setProperty('--drop-poses', 'url("/brand/drop-goose-poses-034.webp")');
      if (!film.classList.contains('is-playing')) pose.classList.add('has-poses');
    };
    if (!(connection && connection.saveData)) poses.src = '/brand/drop-goose-poses-034.webp';
    film.querySelector('[data-drop-skip]').addEventListener('click', settleFilm);
    film.querySelector('.sg-drop-lupa img').addEventListener('error', function () {
      film.querySelector('.sg-drop-lupa').hidden = true;
    });
    document.addEventListener('visibilitychange', function () {
      film.classList.toggle('is-paused', document.hidden);
      if (document.hidden && film.classList.contains('is-playing')) settleFilm();
    });
    reducedMotion.addEventListener('change', function () { if (reducedMotion.matches) settleFilm(); });
  }

  function lockScroll() {
    scrollY = window.scrollY || window.pageYOffset;
    document.body.style.position = "fixed";
    document.body.style.top = "-" + scrollY + "px";
    document.body.style.left = "0";
    document.body.style.right = "0";
    document.body.style.width = "100%";
  }
  function unlockScroll() {
    document.body.style.position = "";
    document.body.style.top = "";
    document.body.style.left = "";
    document.body.style.right = "";
    document.body.style.width = "";
    window.scrollTo({ top: scrollY, left: 0, behavior: "instant" });
  }

  function trapFocus(e) {
    var scope = zoomOpen ? zoomEl : openEl;
    if (!scope || e.key !== "Tab") return;
    var focusables = Array.from(scope.querySelectorAll('button, a[href], [tabindex]:not([tabindex="-1"])')).filter(function (control) {
      return !control.disabled && control.getClientRects().length;
    });
    if (!focusables.length) return;
    var first = focusables[0], last = focusables[focusables.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  }

  function open(el) {
    if (!el) return;
    if (openEl === el) return;
    if (openEl) close(openEl, { silent: true });
    if (el === popupEl) {
      markPopupSeen();
      window.SG.entryPopupSettled = false;
      startFilm();
      document.body.classList.add('sg-entry-popup-open');
    }
    lastFocused = document.activeElement;
    lockScroll();
    el.classList.add("is-open");
    el.setAttribute("aria-hidden", "false");
    openEl = el;
    if (el === popupEl) window.dispatchEvent(new CustomEvent('sg:overlay', { detail: { open: true } }));
    var closeBtn = el.querySelector(".popup-close");
    closeBtn && closeBtn.focus();
    document.addEventListener("keydown", onKeydown);
  }

  function close(el, opts) {
    opts = opts || {};
    if (!el.classList.contains("is-open")) return;
    el.classList.remove("is-open");
    el.setAttribute("aria-hidden", "true");
    if (openEl === el) {
      openEl = null;
      unlockScroll();
      document.removeEventListener("keydown", onKeydown);
      if (!opts.silent && lastFocused && lastFocused.focus) lastFocused.focus();
    }
    if (el === popupEl) {
      settleFilm();
      document.body.classList.remove('sg-entry-popup-open');
      if (!document.body.classList.contains('category-page-open')) window.dispatchEvent(new CustomEvent('sg:overlay', { detail: { open: false } }));
      window.SG.entryPopupSettled = true;
      document.dispatchEvent(new CustomEvent("sg:entry-popup-settled"));
    }
  }

  function onKeydown(e) {
    if (e.key === "Escape") {
      if (zoomOpen) { closeZoom(); return; }
      if (openEl) close(openEl);
    }
    trapFocus(e);
  }

  function openZoom(src, alt) {
    if (!zoomEl) return;
    var img = zoomEl.querySelector("[data-zoom-img]");
    if (img) { img.src = src; img.alt = alt || ""; }
    zoomEl.classList.add("is-open");
    zoomEl.setAttribute("aria-hidden", "false");
    zoomOpen = true;
    var closeBtn = zoomEl.querySelector(".popup-close");
    closeBtn && closeBtn.focus();
  }

  function closeZoom() {
    if (!zoomEl || !zoomOpen) return;
    zoomEl.classList.remove("is-open");
    zoomEl.setAttribute("aria-hidden", "true");
    zoomOpen = false;
  }

  // CTAs de fechar que também são links âncora (#colecao) precisam navegar de
  // verdade — preventDefault bloquearia o smooth-scroll nativo do href.
  function isNavigationLink(el) {
    // Preserve category links too: the router (or native navigation when it
    // has not loaded yet) must receive the click after closing the modal.
    return el.tagName === "A" && !!el.getAttribute("href");
  }

  document.addEventListener("click", function (e) {
    if (e.target.closest("[data-open-popup]")) { e.preventDefault(); open(popupEl); }
    var closePopupTrigger = e.target.closest("[data-close-popup]");
    if (closePopupTrigger) { if (!isNavigationLink(closePopupTrigger)) e.preventDefault(); close(popupEl); }
    var closeQvTrigger = e.target.closest("[data-close-quickview]");
    if (closeQvTrigger) { if (!isNavigationLink(closeQvTrigger)) e.preventDefault(); close(qvEl); }
    if (cartEl && e.target.closest("[data-open-cart]")) { e.preventDefault(); open(cartEl); }
    var closeCartTrigger = cartEl && e.target.closest("[data-close-cart]");
    if (closeCartTrigger) { if (!isNavigationLink(closeCartTrigger)) e.preventDefault(); close(cartEl); }
    if (favoritesEl && e.target.closest("[data-open-favorites]")) { e.preventDefault(); open(favoritesEl); }
    var closeFavTrigger = favoritesEl && e.target.closest("[data-close-favorites]");
    if (closeFavTrigger) { if (!isNavigationLink(closeFavTrigger)) e.preventDefault(); close(favoritesEl); }
    if (checkoutEl && e.target.closest("[data-close-checkout]")) { e.preventDefault(); close(checkoutEl); }
    if (reviewEl && e.target.closest("[data-open-review-modal]")) { e.preventDefault(); open(reviewEl); }
    if (reviewEl && e.target.closest("[data-close-review]")) { e.preventDefault(); close(reviewEl); }
    if (zoomEl && e.target.closest("[data-close-zoom]")) { e.preventDefault(); closeZoom(); }
  });

  if (cartEl) {
    window.SG.openCart = function () { open(cartEl); };
    window.SG.closeCart = function () { close(cartEl); };
  }
  if (favoritesEl) {
    window.SG.openFavorites = function () { open(favoritesEl); };
    window.SG.closeFavorites = function () { close(favoritesEl); };
  }
  if (checkoutEl) {
    window.SG.openCheckout = function () { open(checkoutEl); };
    window.SG.closeCheckout = function () { close(checkoutEl); };
  }
  if (reviewEl) {
    window.SG.openReviewModal = function () { open(reviewEl); };
    window.SG.closeReviewModal = function () { close(reviewEl); };
  }
  if (zoomEl) {
    window.SG.openZoomWith = openZoom;
  }

  // Quick view content fill + open (chamado por products.js)
  window.SG.openQuickView = function (product) {
    if (!qvEl) return;
    var fav = window.SG.wishlist && window.SG.wishlist.isFavorite(product.id);
    var artEl = qvEl.querySelector("[data-qv-art]");
    artEl.innerHTML =
      '<img src="' + window.SG.esc(product.images[0]) + '" alt="' + window.SG.esc(product.name) + '" data-open-zoom data-qv-main style="cursor:zoom-in">' +
      (product.images.length > 1
        ? '<div class="qv-thumbs">' + product.images.map(function (src, i) {
            return '<button type="button" class="qv-thumb' + (i === 0 ? " is-active" : "") + '" data-qv-thumb="' + i + '" aria-label="Foto ' + (i + 1) + " de " + product.images.length + '"' + (i === 0 ? ' aria-current="true"' : "") + '><img src="' + window.SG.esc(src) + '" alt=""></button>';
          }).join("") + "</div>"
        : "");
    artEl.querySelectorAll("[data-qv-thumb]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var src = product.images[+btn.getAttribute("data-qv-thumb")];
        artEl.querySelector("[data-qv-main]").setAttribute("src", src);
        zoomEl && zoomEl.setAttribute("data-zoom-src", src);
        artEl.querySelectorAll("[data-qv-thumb]").forEach(function (b) {
          b.classList.toggle("is-active", b === btn);
          if (b === btn) b.setAttribute("aria-current", "true"); else b.removeAttribute("aria-current");
        });
      });
    });
    qvEl.querySelector("[data-qv-tag]").textContent = product.tag;
    qvEl.querySelector("[data-qv-name]").textContent = product.name;
    qvEl.querySelector("[data-qv-desc]").textContent = product.desc;
    var qvPrice = qvEl.querySelector("[data-qv-price]");
    qvPrice.textContent = product.priceLabel;
    qvPrice.setAttribute("data-price-for", product.id);
    qvEl.querySelector("[data-qv-frame]").textContent = product.frameColor;
    qvEl.querySelector("[data-qv-lens]").textContent = product.lensColor;
    qvEl.querySelector("[data-qv-material]").textContent = product.material || "—";
    qvEl.querySelector("[data-qv-sku]").textContent = product.sku;
    // Armação/Lente só fazem sentido para óculos; linha sem dado real ("—")
    // some em vez de exibir campo vazio (perfume com "Armação: Perfumes")
    var isEyewear = !product.category || product.category === "lupa";
    [["[data-qv-frame]", isEyewear], ["[data-qv-lens]", isEyewear && product.lensColor !== "—"], ["[data-qv-material]", !!product.material && product.material !== "—"]]
      .forEach(function (row) {
        var li = qvEl.querySelector(row[0]);
        if (li && li.parentElement) li.parentElement.hidden = !row[1];
      });
    var addBtn = qvEl.querySelector("[data-qv-add]");
    var buyBtn = qvEl.querySelector("[data-qv-buy]");
    var favBtn = qvEl.querySelector("[data-qv-fav]");
    if (addBtn) addBtn.setAttribute("data-add-to-cart", product.id);
    if (buyBtn) buyBtn.setAttribute("data-buy-now", product.id);
    var waBtn = qvEl.querySelector("[data-qv-wa]");
    var consult = !!product.consultWhatsApp;
    // esgotada (painel): some sacola/comprar/WhatsApp, fica só o favorito
    if (addBtn) addBtn.hidden = consult || !!product.soldOut;
    if (buyBtn) buyBtn.hidden = consult || !!product.soldOut;
    if (waBtn) {
      waBtn.hidden = !consult;
      if (consult) waBtn.setAttribute("href", window.SG.waProductLink(product));
    }
    if (favBtn) {
      favBtn.setAttribute("data-favorite-toggle", product.id);
      favBtn.classList.toggle("is-active", !!fav);
      favBtn.setAttribute("aria-pressed", fav ? "true" : "false");
    }
    zoomEl && zoomEl.setAttribute("data-zoom-src", product.images[0]);
    qvEl.style.setProperty("--accent", product.campaignAccent || "#ff5a00");
    open(qvEl);
  };

  // clique na imagem do quick view abre o zoom com a mesma peça
  document.addEventListener("click", function (e) {
    var trigger = e.target.closest("[data-open-zoom]");
    if (!trigger || !window.SG.openZoomWith) return;
    window.SG.openZoomWith(trigger.getAttribute("src"), trigger.getAttribute("alt"));
  });

  // Drop popup — dispara no máximo uma vez por sessão, depois de tempo OU scroll,
  // nunca no primeiro frame, e nunca de novo depois de fechado (por qualquer via).
  var SEEN_KEY = "sgPopupSeen";
  var triggered = false;
  try { triggered = sessionStorage.getItem(SEEN_KEY) === "1"; } catch (_) { /* privacy mode */ }
  window.SG.entryPopupSettled = triggered || !popupEl;
  if (window.SG.entryPopupSettled) document.dispatchEvent(new CustomEvent("sg:entry-popup-settled"));
  var timeTrigger;
  var introReady = !document.querySelector("[data-intro-loader]") || !!(window.SG && window.SG.introComplete);
  function markPopupSeen() {
    if (triggered) return;
    triggered = true;
    try { sessionStorage.setItem(SEEN_KEY, "1"); } catch (_) { /* in-memory guard remains */ }
    window.removeEventListener("scroll", onScrollTrigger);
    clearTimeout(timeTrigger);
  }
  function maybeTrigger() {
    if (!introReady || triggered || !popupEl) return;
    if (openEl || document.querySelector('dialog[open]') || document.hidden) {
      timeTrigger = setTimeout(maybeTrigger, 500);
      return;
    }
    open(popupEl); // open() já chama markPopupSeen() para el===popupEl
  }
  function onScrollTrigger() {
    var pct = (window.scrollY || window.pageYOffset) / (document.documentElement.scrollHeight - window.innerHeight);
    if (pct >= 0.32) maybeTrigger();
  }
  if (!triggered) {
    // Se o usuário pulou a intro antes deste módulo carregar, o evento já
    // aconteceu. Nesse caso respeita a mesma espera curta do fluxo normal,
    // sem voltar ao atraso inicial de 9s. A automação mantém o atraso longo.
    timeTrigger = setTimeout(maybeTrigger, introReady ? 350 : 9000);
    window.addEventListener("scroll", onScrollTrigger, { passive: true });
    document.addEventListener("sg:intro-complete", function () {
      introReady = true;
      clearTimeout(timeTrigger);
      timeTrigger = setTimeout(maybeTrigger, 350);
    }, { once: true });
  }
})();

