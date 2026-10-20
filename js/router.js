/* Street Goose 034 — Router mínimo: /categoria/:slug (hero scroll-scrub,
   overlay próprio) + rotas de app genéricas (busca, favoritos, sacola,
   checkout, conta, ranking, recompensas, comunidade, admin — overlay [data-app-page]
   compartilhado). History API + fallback SPA (vercel.json rewrite). Uma
   única fonte de verdade para "rota ativa"; navigate()/popstate convergem
   no mesmo render(). Cada módulo de página é importado sob demanda. */
import { ROUTE_META, SITE_ORIGIN, metaForPath } from "./route-meta.js";

(function () {
  "use strict";

  var catOverlay = document.querySelector("[data-category-page]");
  var appOverlay = document.querySelector("[data-app-page]");
  if (!catOverlay && !appOverlay) return;

  var CATEGORY_SLUGS = ["lupas", "acessorios", "relogios", "perfumes", "trajes"];
  // imports literais (não de variável) — o Vite só consegue empacotar e
  // hashear corretamente import() com string estática; um caminho vindo de
  // variável (mesmo com @vite-ignore) não é processado e vira 404 no build
  var APP_LOADERS = {
    "/busca": function () { return import("./search-page.js").then(function (m) { return m.mountSearchPage; }); },
    "/favoritos": function () { return import("./favorites-page.js").then(function (m) { return m.mountFavoritesPage; }); },
    "/sacola": function () { return import("./cart-page.js").then(function (m) { return m.mountCartPage; }); },
    "/checkout": function () { return import("./checkout-page.js").then(function (m) { return m.mountCheckoutPage; }); },
    "/conta": function () { return import("./account-page.js").then(function (m) { return m.mountAccountPage; }); },
    "/conta/pedidos": function () { return import("./account-page.js").then(function (m) { return m.mountAccountPage; }); },
    "/ranking": function () { return import("./ranking-page.js").then(function (m) { return m.mountRankingPage; }); },
    "/recompensas": function () { return import("./rewards-page.js").then(function (m) { return m.mountRewardsPage; }); },
    "/comunidade": function () { return import("./community-page.js").then(function (m) { return m.mountCommunityPage; }); },
    "/pedido/:id": function () { return import("./order-page.js").then(function (m) { return m.mountOrderPage; }); },
    "/admin": function () { return import("./admin-page.js").then(function (m) { return m.mountAdminPage; }); },
    "/termos": function () { return import("./legal-page.js").then(function (m) { return m.mountLegalPage; }); },
    "/privacidade": function () { return import("./legal-page.js").then(function (m) { return m.mountLegalPage; }); },
    "/trocas": function () { return import("./legal-page.js").then(function (m) { return m.mountLegalPage; }); },
  };

  var scrollY = 0;
  var currentTeardown = null;
  // Bumped on every open/close: a page whose code is still downloading when
  // the visitor has already moved on must not open afterwards.
  var routeToken = 0;
  var categoryModule = null;
  var appModules = {};

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

  function categorySlugFromPath(path) {
    var m = /^\/categoria\/([a-z]+)\/?$/.exec(path);
    if (!m) return null;
    return CATEGORY_SLUGS.indexOf(m[1]) !== -1 ? m[1] : null;
  }

  function requestClose() { navigate("/"); }

  function setPortalPreviewsPaused(paused) {
    document.querySelectorAll(".portal-card-video").forEach(function (v) {
      if (paused) v.pause();
      else if (v.getBoundingClientRect().top < window.innerHeight) v.play().catch(function () {});
    });
  }

  // IntersectionObserver não sabe que um overlay position:fixed cobriu a
  // tela — geometricamente a hero/product-universe/film-canvas continuam
  // "intersectando" o viewport, então continuariam rendendo atrás da
  // categoria aberta, competindo por GPU com o vídeo em scrub. Esse evento é
  // o sinal explícito que cada render loop escuta pra pausar de verdade.
  function setOverlayOpen(open) {
    document.body.classList.toggle("category-page-open", open);
    window.dispatchEvent(new CustomEvent("sg:overlay", { detail: { open: open } }));
  }

  async function openCategory(slug) {
    var token = ++routeToken;
    try {
      if (!categoryModule) categoryModule = await import("./category-page.js");
    } catch (err) { return; }
    if (token !== routeToken) return;
    // Category to category: close the previous one, keep the saved scroll.
    if (currentTeardown) { currentTeardown(); currentTeardown = null; }
    // A category URL ships its page already in the HTML (see
    // scripts/vite-seo-pages.ts): visible but not opened by the router yet.
    var prerendered = catOverlay.hasAttribute("data-prerendered");
    catOverlay.removeAttribute("data-prerendered");
    var alreadyOpen = !catOverlay.hidden && !prerendered;
    if (!alreadyOpen) {
      setPortalPreviewsPaused(true);
      lockScroll();
    }
    catOverlay.hidden = false;
    if (!alreadyOpen) setOverlayOpen(true);
    currentTeardown = categoryModule.mountCategoryPage(catOverlay, slug, requestClose, prerendered);
  }

  function closeCategory() {
    routeToken++;
    if (currentTeardown) { currentTeardown(); currentTeardown = null; }
    catOverlay.hidden = true;
    catOverlay.innerHTML = "";
    setOverlayOpen(false);
    unlockScroll();
    setPortalPreviewsPaused(false);
  }

  async function openAppRoute(path, params) {
    var loader = APP_LOADERS[path];
    if (!loader) return;
    var token = ++routeToken;
    try {
      if (!appModules[path]) appModules[path] = await loader();
    } catch (err) { return; }
    if (token !== routeToken) return;
    // Page to page (ranking -> benefits): close the previous page first, so
    // its scene and listeners never keep running hidden, and keep the home
    // scroll position saved when the first page opened.
    if (currentTeardown) { currentTeardown(); currentTeardown = null; }
    var alreadyOpen = !appOverlay.hidden;
    if (!alreadyOpen) {
      setPortalPreviewsPaused(true);
      lockScroll();
    }
    appOverlay.hidden = false;
    appOverlay.setAttribute("data-active-route", path);
    if (!alreadyOpen) setOverlayOpen(true);
    currentTeardown = appModules[path](appOverlay, params, requestClose);
  }

  function closeAppRoute() {
    routeToken++;
    if (currentTeardown) { currentTeardown(); currentTeardown = null; }
    appOverlay.hidden = true;
    appOverlay.innerHTML = "";
    appOverlay.removeAttribute("data-active-route");
    setOverlayOpen(false);
    unlockScroll();
    setPortalPreviewsPaused(false);
  }

  // Tab title, description and canonical follow the route, the same values
  // the build writes into each URL's HTML (js/route-meta.js).
  function applyRouteMeta(path) {
    var meta = metaForPath(path) || ROUTE_META["/"];
    document.title = meta.title;
    var desc = document.querySelector('meta[name="description"]');
    if (desc && meta.description) desc.setAttribute("content", meta.description);
    var canonical = document.querySelector('link[rel="canonical"]');
    if (canonical && meta.index) canonical.setAttribute("href", SITE_ORIGIN + (path === "/" ? "/" : path));
  }

  function render() {
    var path = location.pathname;
    applyRouteMeta(path.replace(/\/$/, "") || "/");
    var catSlug = categorySlugFromPath(path);
    // Keep the home hero paintable when SPA navigation returns from a direct
    // category entry. Does not toggle display/position/dimensions.
    document.documentElement.toggleAttribute("data-sg-direct-category", Boolean(catSlug));
    var orderMatch = /^\/pedido\/([^/]+)\/?$/.exec(path);
    var appPath = orderMatch ? "/pedido/:id" : path.replace(/\/$/, "") || "/";
    var isAppRoute = orderMatch ? true : Object.prototype.hasOwnProperty.call(APP_LOADERS, appPath);

    if (catSlug) {
      if (!appOverlay.hidden) closeAppRoute();
      if (!catOverlay.hidden && catOverlay.getAttribute("data-active-slug") === catSlug) return;
      catOverlay.setAttribute("data-active-slug", catSlug);
      void openCategory(catSlug);
      return;
    }
    if (!catOverlay.hidden) { catOverlay.removeAttribute("data-active-slug"); closeCategory(); }

    if (orderMatch) {
      if (!appOverlay.hidden && appOverlay.getAttribute("data-active-route") === "/pedido/:id" && appOverlay.getAttribute("data-order-id") === orderMatch[1]) return;
      appOverlay.setAttribute("data-order-id", orderMatch[1]);
      void openAppRoute("/pedido/:id", { orderId: orderMatch[1] });
      return;
    }
    if (isAppRoute) {
      if (!appOverlay.hidden && appOverlay.getAttribute("data-active-route") === appPath) return;
      void openAppRoute(appPath, {});
      return;
    }
    if (!appOverlay.hidden) closeAppRoute();
    else routeToken++; // back home while a page was still downloading
  }

  function navigate(path) {
    if (location.pathname !== path) history.pushState({}, "", path);
    render();
  }

  window.addEventListener("popstate", render);
  render();

  // The ranking stage is the heaviest page (its own 3D scene): start fetching
  // its code the moment a finger or pointer reaches a link to it, so the tap
  // opens a page that is already downloaded.
  var rankingPrefetched = false;
  function prefetchOnIntent(e) {
    if (rankingPrefetched) return;
    var link = e.target && e.target.closest && e.target.closest("a[href]");
    if (!link) return;
    var url;
    try { url = new URL(link.getAttribute("href"), location.href); } catch (err) { return; }
    if (url.origin !== location.origin || url.pathname.replace(/\/$/, "") !== "/ranking") return;
    rankingPrefetched = true;
    APP_LOADERS["/ranking"]().catch(function () { rankingPrefetched = false; });
    import("three").catch(function () {});
  }
  document.addEventListener("pointerover", prefetchOnIntent, { passive: true });
  document.addEventListener("touchstart", prefetchOnIntent, { passive: true });
  document.addEventListener("focusin", prefetchOnIntent);

  window.SG_ROUTER = { navigate: navigate, close: function () { navigate("/"); } };
})();

export {};
