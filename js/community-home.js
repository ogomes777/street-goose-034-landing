/* Street Goose 034 — Capítulo 07 (SG Community) na home: mural editorial
   com os visuais reais aprovados (destaques do lojista primeiro). Busca só
   quando a seção chega perto da tela. Cada foto leva ao post em
   /comunidade?post=ID; sem post aprovado ainda, mostra o convite para o
   primeiro visual (com fotos de campanha da marca, nunca como se fossem de
   clientes). */
import { service, avatarHtml, altFor, productFor, emptyStateHtml, ICONS } from "./community-ui.js";

(function () {
  var section = document.querySelector("[data-community-home]");
  var mosaic = section && section.querySelector("[data-community-mosaic]");
  if (!mosaic) return;
  var statsEl = section.querySelector("[data-community-stats]");
  var TILES = 5;

  function esc(v) { return window.SG.esc(v == null ? "" : String(v)); }

  function skeleton() {
    var out = "";
    for (var i = 0; i < TILES; i++) out += '<span class="sgc-tile sgc-tile--' + (i + 1) + ' is-skeleton" aria-hidden="true"></span>';
    mosaic.innerHTML = out;
    mosaic.setAttribute("aria-busy", "true");
  }

  function tileHtml(post, i) {
    var p = productFor(post.productId);
    return '<a class="sgc-tile sgc-tile--' + (i + 1) + '" href="/comunidade?post=' + encodeURIComponent(post.id) + '" style="--i:' + i + '">' +
      (post.imageUrl ? '<img src="' + esc(post.imageUrl) + '" alt="' + esc(altFor(post)) + '" loading="lazy" decoding="async">' : "") +
      '<span class="sgc-tile-shade" aria-hidden="true"></span>' +
      (post.featured ? '<span class="sgc-badge">Destaque</span>' : "") +
      '<span class="sgc-tile-meta">' + avatarHtml(post.author) +
        '<span class="sgc-tile-who"><b>' + esc(post.author.name) + "</b>" + (p ? "<small>Usando " + esc(p.name) + "</small>" : "") + "</span>" +
        '<span class="sgc-tile-likes">' + ICONS.heart + post.likeCount + "</span>" +
      "</span>" +
    "</a>";
  }

  function ctaTileHtml(i) {
    return '<a class="sgc-tile sgc-tile--' + (i + 1) + ' sgc-tile--cta" href="/comunidade?postar=1">' +
      ICONS.camera + "<b>Seu visual aqui</b><small>Poste usando a peça · +30 XP quando aprovar</small></a>";
  }

  function emptyHtml() {
    return emptyStateHtml('<a class="btn btn-primary" href="/comunidade?postar=1">Postar meu visual</a>', "sgc-empty--home");
  }

  async function load() {
    var svc = await service();
    if (!svc.isConfigured()) { mosaic.innerHTML = emptyHtml(); mosaic.removeAttribute("aria-busy"); return; }
    var res = await svc.getFeed({ sort: "home", limit: TILES });
    mosaic.removeAttribute("aria-busy");
    if (!res || !res.items.length) {
      mosaic.classList.add("is-empty");
      mosaic.innerHTML = emptyHtml();
      if (statsEl) statsEl.hidden = true;
      return;
    }
    mosaic.classList.remove("is-empty");
    var items = res.items.slice(0, TILES);
    mosaic.setAttribute("data-count", String(items.length));
    mosaic.innerHTML = items.map(tileHtml).join("") + (items.length < TILES ? ctaTileHtml(items.length) : "");
    if (statsEl) {
      statsEl.textContent = res.stats.posts + (res.stats.posts === 1 ? " visual" : " visuais") + " · " +
        res.stats.members + (res.stats.members === 1 ? " membro" : " membros") + " · " +
        res.stats.likes + (res.stats.likes === 1 ? " curtida" : " curtidas");
      statsEl.hidden = false;
    }
  }

  skeleton();
  var started = false;
  function start() { if (started) return; started = true; load().catch(function () { mosaic.innerHTML = emptyHtml(); mosaic.removeAttribute("aria-busy"); }); }
  if ("IntersectionObserver" in window) {
    var obs = new IntersectionObserver(function (entries) {
      if (!entries.some(function (e) { return e.isIntersecting; })) return;
      obs.disconnect();
      start();
    }, { rootMargin: "900px 0px" });
    obs.observe(section);
  } else {
    start();
  }

  // voltou de /comunidade (curtiu, postou): mural atualizado sem recarregar
  var appPage = document.querySelector("[data-app-page]");
  var fromCommunity = false;
  window.addEventListener("sg:overlay", function (e) {
    if (!e.detail) return;
    if (e.detail.open) { fromCommunity = !!appPage && appPage.getAttribute("data-active-route") === "/comunidade"; return; }
    if (started && fromCommunity) load().catch(function () {});
    fromCommunity = false;
  });
})();

export {};
