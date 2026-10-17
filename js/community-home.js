/* Street Goose 034 — Capítulo 07 (SG Community) na home: mural editorial
   com os visuais reais aprovados (destaques do lojista primeiro). Busca só
   quando a seção chega perto da tela. Cada foto leva ao post em
   /comunidade?post=ID; sem post aprovado ainda, mostra o convite para o
   primeiro visual (com fotos de campanha da marca, nunca como se fossem de
   clientes). */
import { service, altFor, productFor, ringHtml, ICONS } from "./community-ui.js";

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
      '<span class="sgc-tile-meta">' + ringHtml(post.author, post.featured) +
        '<span class="sgc-tile-who"><b>' + esc(post.author.name) + "</b>" + (p ? "<small>Usando " + esc(p.name) + "</small>" : "") + "</span>" +
        '<span class="sgc-tile-likes">' + ICONS.heart + post.likeCount + "</span>" +
      "</span>" +
    "</a>";
  }

  function ctaTileHtml(i) {
    return '<a class="sgc-tile sgc-tile--' + (i + 1) + ' sgc-tile--cta" href="/comunidade?postar=1">' +
      ICONS.camera + "<b>Seu visual aqui</b><small>Poste usando a peça +30 XP quando aprovar</small></a>";
  }

  var CAMPAIGN = [
    { src: new URL("../assets/lifestyle/web/community-01.webp", import.meta.url).href, pos: "70% 30%" },
    { src: new URL("../assets/lifestyle/web/community-02.webp", import.meta.url).href, pos: "50% 40%" },
    { src: new URL("../assets/lifestyle/web/community-03.webp", import.meta.url).href, pos: "50% 45%" },
  ];
  var STEP_ICONS = {
    camera: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 8h3l2-2.5h6L17 8h3v11H4z"/><circle cx="12" cy="13" r="3.6"/></svg>',
    check: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3l7 3v5c0 4.6-3 8.3-7 10-4-1.7-7-5.4-7-10V6z"/><path d="M8.6 12.2l2.4 2.4 4.6-4.8"/></svg>',
    spark: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3v4M12 17v4M3 12h4M17 12h4M6.3 6.3l2.8 2.8M14.9 14.9l2.8 2.8M17.7 6.3l-2.8 2.8M9.1 14.9l-2.8 2.8"/></svg>',
  };

  /* App chrome: a bar with the mural's live state; numbers only when real. */
  function barHtml(stats) {
    var chips = stats
      ? '<span class="sgc-app-chip">' + stats.posts + (stats.posts === 1 ? " visual" : " visuais") + '</span><span class="sgc-app-chip">' + stats.members + (stats.members === 1 ? " membro" : " membros") + "</span>"
      : '<span class="sgc-app-chip">Aprovado pela equipe</span>';
    return '<div class="sgc-app-bar"><span class="sgc-app-logo" aria-hidden="true">SG</span><span class="sgc-app-title"><b>Mural 034</b><small><i aria-hidden="true"></i>Ao vivo</small></span><span class="sgc-app-chips">' + chips + "</span></div>";
  }

  /* No approved post yet: an app screen inviting the first visual. The
     photos are brand campaign shots, labelled as such, never as customers. */
  function emptyHtml() {
    return '<div class="sgc-app sgc-app--empty">' + barHtml(null) +
      '<div class="sgc-app-body">' +
        '<div class="sgc-app-feed" aria-hidden="true">' +
          CAMPAIGN.map(function (p, i) {
            return '<figure class="sgc-app-card sgc-app-card--' + (i + 1) + '"><img src="' + p.src + '" alt="" loading="lazy" decoding="async" style="object-position:' + p.pos + '">' +
              (i === 0 ? '<figcaption><span class="sgc-app-who"><span class="sgc-ring is-hot"><span class="sgc-avatar">SG</span></span><span><b>streetgoose034</b><small>Campanha 034</small></span></span></figcaption>' : "") +
              "</figure>";
          }).join("") +
        "</div>" +
        '<div class="sgc-app-onboard"><p class="kicker">O MURAL COMEÇA COM VOCÊ</p><h3>Seja o primeiro visual da SG Community.</h3>' +
          '<ol class="sgc-app-steps">' +
            '<li><span class="sgc-app-step-ico">' + STEP_ICONS.camera + '</span><span><b>Poste seu visual</b><small>Uma foto usando a peça da Street Goose</small></span></li>' +
            '<li><span class="sgc-app-step-ico">' + STEP_ICONS.check + '</span><span><b>A equipe aprova</b><small>Curadoria real, sem filtro de marketplace</small></span></li>' +
            '<li><span class="sgc-app-step-ico">' + STEP_ICONS.spark + '</span><span><b>Você entra no mural</b><small>E ganha +30 XP na constelação</small></span></li>' +
          "</ol>" +
          '<a class="btn btn-primary sgc-app-cta" href="/comunidade?postar=1">Postar meu visual</a>' +
        "</div>" +
      "</div></div>";
  }

  /* Single place for the empty state, so every path (not configured, network
     error, no posts) gets the same block-level layout. */
  function showEmpty() {
    mosaic.classList.add("is-empty");
    mosaic.removeAttribute("data-count");
    mosaic.removeAttribute("aria-busy");
    mosaic.innerHTML = emptyHtml();
    if (statsEl) statsEl.hidden = true;
  }

  async function load() {
    var svc = await service();
    if (!svc.isConfigured()) { showEmpty(); return; }
    var res = await svc.getFeed({ sort: "home", limit: TILES });
    if (!res || !res.items.length) { showEmpty(); return; }
    mosaic.removeAttribute("aria-busy");
    mosaic.classList.remove("is-empty");
    var items = res.items.slice(0, TILES);
    mosaic.setAttribute("data-count", String(items.length));
    mosaic.innerHTML = items.map(tileHtml).join("") + (items.length < TILES ? ctaTileHtml(items.length) : "");
    var bar = section.querySelector(".sgc-home-bar");
    if (!bar) { bar = document.createElement("div"); bar.className = "sgc-home-bar"; mosaic.before(bar); }
    bar.innerHTML = barHtml(res.stats);
    if (statsEl) {
      statsEl.textContent = res.stats.posts + (res.stats.posts === 1 ? " visual" : " visuais") + " " +
        res.stats.members + (res.stats.members === 1 ? " membro" : " membros") + " " +
        res.stats.likes + (res.stats.likes === 1 ? " curtida" : " curtidas");
      statsEl.hidden = false;
    }
  }

  skeleton();
  var started = false;
  function start() { if (started) return; started = true; load().catch(showEmpty); }
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
