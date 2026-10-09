/* Street Goose 034 — /comunidade: a rede social da marca.
   Feed público (só aprovados, community_feed da 0105) em mural grande,
   curtir, compartilhar, peça marcada, visualizador em tela cheia com link
   próprio (/comunidade?post=ID — voltar do navegador fecha) e "Meus posts"
   com o status da moderação. ?postar=1 abre o formulário de publicação. */
import {
  service, postCardHtml, toggleLike, sharePost, openProduct, openViewer, startPublish,
  ratio, timeAgo, emptyStateHtml, ICONS,
} from "./community-ui.js";

var PAGE_SIZE = 18;

export function mountCommunityPage(root, _params, onClose) {
  function esc(v) { return window.SG.esc(v == null ? "" : String(v)); }

  root.innerHTML =
    '<div class="app-page-head"><h1>SG Community</h1>' +
    '<div class="app-page-head-actions">' +
      '<button class="btn btn-primary sgc-head-publish" type="button" data-community-publish aria-label="Postar visual">' + ICONS.camera + "<span>Postar visual</span></button>" +
      '<button class="app-page-close" type="button" data-app-close aria-label="Fechar"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg></button>' +
    "</div></div>" +
    '<div class="app-page-body sgc-page" data-community-body>' +
      '<section class="sgc-intro">' +
        '<div><p class="kicker">SG COMMUNITY · 034</p>' +
        "<h2>Na rua, com a<br>Street Goose.</h2>" +
        "<p>Visuais reais de quem usa. Você posta, a equipe aprova e o seu visual entra aqui — com <b>+30 XP</b> na conta.</p></div>" +
        '<dl class="sgc-stats" data-stats aria-live="polite"></dl>' +
      "</section>" +
      '<div class="sgc-tabs" role="tablist" aria-label="Feed da comunidade">' +
        '<button type="button" role="tab" data-tab="recent" aria-selected="true">Recentes</button>' +
        '<button type="button" role="tab" data-tab="top" aria-selected="false">Em alta</button>' +
        '<button type="button" role="tab" data-tab="mine" aria-selected="false">Meus posts</button>' +
      "</div>" +
      '<div class="sgc-feed-wrap" data-feed role="tabpanel"><div class="app-page-loading">Carregando…</div></div>' +
    "</div>";

  var bodyEl = root.querySelector("[data-community-body]");
  var feedEl = root.querySelector("[data-feed]");
  var statsEl = root.querySelector("[data-stats]");
  var destroyed = false;
  var tab = "recent";
  var posts = [];
  var hasMore = false;
  var loading = false;
  var seq = 0;
  var viewer = null;
  var viewerPushed = false;
  var sentinelObs = null;
  var unsubscribeAuth = null;

  // ---------- feed ----------
  function renderStats(stats) {
    if (!stats) { statsEl.innerHTML = ""; return; }
    statsEl.innerHTML =
      "<div><dt>Visuais</dt><dd>" + stats.posts + "</dd></div>" +
      "<div><dt>Membros</dt><dd>" + stats.members + "</dd></div>" +
      "<div><dt>Curtidas</dt><dd>" + stats.likes + "</dd></div>";
  }

  function emptyHtml() {
    return emptyStateHtml('<button class="btn btn-primary" type="button" data-community-publish>Postar meu visual</button>');
  }

  var colHeights = [];
  function colCount() { return feedEl.clientWidth >= 680 ? 2 : 1; }

  function placePosts(list, from) {
    var cols = feedEl.querySelectorAll("[data-col]");
    list.forEach(function (p, k) {
      var target = 0;
      for (var j = 1; j < cols.length; j++) if (colHeights[j] < colHeights[target] - 0.05) target = j;
      cols[target].insertAdjacentHTML("beforeend", postCardHtml(p, from === 0 ? k : k % 6));
      colHeights[target] += 1 / ratio(p) + 0.3 + (p.caption ? 0.14 : 0);
    });
  }

  function moreHtml() {
    return hasMore ? '<div class="sgc-more" data-sentinel><button class="btn btn-ghost" type="button" data-load-more>Carregar mais</button></div>' : "";
  }

  function renderFeed() {
    var n = colCount();
    colHeights = [];
    var cols = "";
    for (var i = 0; i < n; i++) { cols += '<div class="sgc-col" data-col="' + i + '"></div>'; colHeights.push(0); }
    feedEl.innerHTML = '<div class="sgc-feed" data-feed-grid data-cols="' + n + '">' + cols + "</div>" + moreHtml();
    placePosts(posts, 0);
    watchSentinel();
  }

  var resizeTimer = null;
  function onResize() {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(function () {
      var grid = feedEl.querySelector("[data-feed-grid]");
      if (grid && Number(grid.getAttribute("data-cols")) !== colCount()) renderFeed();
    }, 160);
  }
  window.addEventListener("resize", onResize);

  async function loadFeed(reset) {
    if (loading && !reset) return false;
    var n = ++seq;
    loading = true;
    if (reset) { posts.length = 0; hasMore = false; feedEl.innerHTML = '<div class="app-page-loading">Carregando…</div>'; }
    var svc = await service();
    if (!svc.isConfigured()) {
      loading = false;
      feedEl.innerHTML = '<div class="app-page-empty"><h2>Comunidade indisponível agora.</h2></div>';
      return false;
    }
    var res = await svc.getFeed({ sort: tab === "top" ? "top" : "recent", limit: PAGE_SIZE, offset: posts.length });
    if (destroyed || n !== seq) return false;
    loading = false;
    if (!res) {
      if (!posts.length) feedEl.innerHTML = '<div class="app-page-empty"><h2>Não foi possível carregar o feed.</h2><button class="btn btn-ghost" type="button" data-retry>Tentar de novo</button></div>';
      return false;
    }
    renderStats(res.stats);
    var start = posts.length;
    Array.prototype.push.apply(posts, res.items); // no lugar: o visualizador aberto enxerga os novos
    hasMore = res.items.length === PAGE_SIZE;
    if (!posts.length) { feedEl.innerHTML = emptyHtml(); return false; }
    if (start === 0 || !feedEl.querySelector("[data-feed-grid]")) {
      renderFeed();
    } else {
      placePosts(res.items, start);
      var more = feedEl.querySelector("[data-sentinel]");
      if (more && !hasMore) more.remove();
      watchSentinel();
    }
    if (viewer) viewer.refresh();
    return res.items.length > 0;
  }

  function watchSentinel() {
    if (sentinelObs) sentinelObs.disconnect();
    var s = feedEl.querySelector("[data-sentinel]");
    if (!s || !("IntersectionObserver" in window)) return;
    sentinelObs = new IntersectionObserver(function (entries) {
      if (entries.some(function (en) { return en.isIntersecting; }) && !loading && hasMore && tab !== "mine") loadFeed(false);
    }, { root: root, rootMargin: "600px 0px" });
    sentinelObs.observe(s);
  }

  // ---------- meus posts ----------
  var STATUS = { pending: ["Em análise", "is-pending"], approved: ["No ar", "is-live"], rejected: ["Não aprovado", "is-rejected"] };
  async function loadMine() {
    var n = ++seq;
    feedEl.innerHTML = '<div class="app-page-loading">Carregando…</div>';
    var session = window.SG.auth ? await window.SG.auth.getSession() : null;
    if (destroyed || n !== seq) return;
    if (!session) {
      feedEl.innerHTML = '<div class="app-page-empty"><h2>Entre na sua conta para ver seus posts.</h2><button class="btn btn-primary" type="button" data-login>Entrar</button></div>';
      return;
    }
    var svc = await service();
    var mine = await svc.getMine();
    if (destroyed || n !== seq) return;
    if (!mine.length) {
      feedEl.innerHTML = '<div class="app-page-empty"><h2>Você ainda não postou nenhum visual.</h2><button class="btn btn-primary" type="button" data-community-publish>Postar meu visual</button></div>';
      return;
    }
    feedEl.innerHTML = '<div class="sgc-mine">' + mine.map(function (p) {
      var st = STATUS[p.status] || ["", ""];
      return '<article class="sgc-mine-card" data-mine="' + esc(p.id) + '">' +
        '<div class="sgc-mine-media" style="aspect-ratio:' + ratio(p).toFixed(4) + '">' +
          (p.imageUrl ? '<img src="' + esc(p.imageUrl) + '" alt="Seu visual" loading="lazy" decoding="async">' : "") +
          '<span class="sgc-status ' + st[1] + '">' + st[0] + "</span>" +
          (p.featured ? '<span class="sgc-badge">Destaque</span>' : "") +
        "</div>" +
        '<div class="sgc-mine-body">' +
          (p.caption ? '<p class="sgc-caption">' + esc(p.caption) + "</p>" : "") +
          "<p class=\"sgc-mine-meta\">" + esc(timeAgo(p.createdAt)) + (p.status === "approved" ? " · " + p.likeCount + (p.likeCount === 1 ? " curtida" : " curtidas") : "") + "</p>" +
          (p.status === "rejected" && p.rejectionReason ? '<p class="sgc-mine-reason">Motivo: ' + esc(p.rejectionReason) + "</p>" : "") +
          (p.status === "pending" ? '<p class="sgc-mine-meta">A equipe aprova e ele entra no feed (+30 XP).</p>' : "") +
          '<div class="sgc-mine-actions" data-mine-actions>' +
            (p.status === "approved" ? '<button class="text-link" type="button" data-open-mine="' + esc(p.id) + '">Ver no feed</button>' : "") +
            '<button class="text-link sgc-danger" type="button" data-delete="' + esc(p.id) + '">Excluir</button>' +
          "</div>" +
        "</div>" +
      "</article>";
    }).join("") + "</div>";
  }

  // ---------- abas ----------
  function selectTab(next) {
    if (next === tab) return;
    tab = next;
    root.querySelectorAll("[data-tab]").forEach(function (b) { b.setAttribute("aria-selected", b.getAttribute("data-tab") === tab ? "true" : "false"); });
    if (sentinelObs) sentinelObs.disconnect();
    if (tab === "mine") loadMine();
    else loadFeed(true);
  }

  // ---------- visualizador + histórico ----------
  function postParam() { return new URLSearchParams(location.search).get("post"); }

  function openPost(id, push) {
    var i = posts.findIndex(function (p) { return p.id === id; });
    if (i === -1) return false;
    if (viewer) { viewer.show(i); return true; }
    viewerPushed = !!push;
    if (push) history.pushState({ sgPost: id }, "", "/comunidade?post=" + encodeURIComponent(id));
    viewer = openViewer({
      posts: posts,
      index: i,
      hasMore: function () { return hasMore && tab !== "mine"; },
      loadMore: function () { return tab === "mine" ? Promise.resolve(false) : loadFeed(false); },
      onIndex: function (idx) {
        var p = posts[idx];
        if (p) history.replaceState(history.state, "", "/comunidade?post=" + encodeURIComponent(p.id));
      },
      onClose: function (fromHistory) {
        viewer = null;
        if (fromHistory) return;
        if (viewerPushed) history.back();
        else history.replaceState(null, "", "/comunidade");
        viewerPushed = false;
      },
    });
    return true;
  }

  // link compartilhado: o post pode não estar na primeira página do feed
  async function openSharedPost(id) {
    if (openPost(id, false)) return;
    var svc = await service();
    var res = await svc.getFeed({ postId: id, limit: 1 });
    if (destroyed) return;
    if (!res || !res.items.length) {
      history.replaceState(null, "", "/comunidade");
      if (window.SG.toast) window.SG.toast("ESSE VISUAL NÃO ESTÁ MAIS NO AR");
      return;
    }
    var p = res.items[0];
    if (!posts.some(function (x) { return x.id === p.id; })) {
      posts.unshift(p);
      if (tab !== "mine") renderFeed();
    }
    openPost(p.id, false);
  }

  function onPopState() {
    var id = postParam();
    if (!id && viewer) { viewer.close(true); return; }
    if (id && !viewer) openSharedPost(id);
    else if (id && viewer) { var i = posts.findIndex(function (p) { return p.id === id; }); if (i >= 0) viewer.show(i); }
  }
  window.addEventListener("popstate", onPopState);

  // ---------- ações ----------
  function postById(id) { return posts.find(function (p) { return p.id === id; }); }

  function publish() {
    startPublish({
      onShowMine: function () { selectTab("mine"); },
      onPublished: function () { if (tab === "mine") loadMine(); },
    });
  }

  root.addEventListener("click", async function (e) {
    var t = e.target;
    if (t.closest("[data-app-close]")) { onClose(); return; }
    if (t.closest("[data-community-publish]")) { publish(); return; }
    var tabBtn = t.closest("[data-tab]");
    if (tabBtn) { selectTab(tabBtn.getAttribute("data-tab")); return; }
    var open = t.closest("[data-open-post]");
    if (open) { openPost(open.getAttribute("data-open-post"), true); return; }
    var like = t.closest("[data-like]");
    if (like) { var lp = postById(like.getAttribute("data-like")); if (lp) toggleLike(lp); return; }
    var share = t.closest("[data-share]");
    if (share) { var sp = postById(share.getAttribute("data-share")); if (sp) sharePost(sp); return; }
    var prod = t.closest("[data-product]");
    if (prod) { openProduct(prod.getAttribute("data-product")); return; }
    if (t.closest("[data-load-more]")) { loadFeed(false); return; }
    if (t.closest("[data-retry]")) { loadFeed(true); return; }
    if (t.closest("[data-login]")) { if (window.SG.auth) window.SG.auth.open(); return; }
    var openMine = t.closest("[data-open-mine]");
    if (openMine) {
      var mineId = openMine.getAttribute("data-open-mine");
      selectTab("recent");
      await loadFeed(true);
      openSharedPost(mineId);
      return;
    }
    var del = t.closest("[data-delete]");
    if (del) {
      var actions = del.closest("[data-mine-actions]");
      actions.innerHTML = '<span class="sgc-confirm">Excluir esse visual de vez?</span>' +
        '<button class="text-link sgc-danger" type="button" data-delete-yes="' + esc(del.getAttribute("data-delete")) + '">Sim, excluir</button>' +
        '<button class="text-link" type="button" data-delete-no>Cancelar</button>';
      return;
    }
    if (t.closest("[data-delete-no]")) { loadMine(); return; }
    var yes = t.closest("[data-delete-yes]");
    if (yes) {
      yes.disabled = true;
      var svc = await service();
      var ok = await svc.deleteMine(yes.getAttribute("data-delete-yes"));
      if (destroyed) return;
      if (window.SG.toast) window.SG.toast(ok ? "VISUAL EXCLUÍDO" : "NÃO FOI POSSÍVEL EXCLUIR AGORA");
      loadMine();
    }
  });

  function onKeydown(e) {
    if (e.key !== "Escape" || viewer) return;
    if (document.querySelector("[data-sgc-publisher], .quickview.is-open, .auth-modal:not([hidden])")) return;
    onClose();
  }
  // captura: roda antes do ESC do login, enquanto ele ainda está aberto (senão
  // fechar o login com ESC fechava a página inteira junto)
  document.addEventListener("keydown", onKeydown, true);

  // login/logout sem sair da página: "curti" e "Meus posts" mudam
  // (só quando a pessoa muda — o Supabase reemite SIGNED_IN ao voltar para a
  // aba, e recarregar ali jogaria o feed rolado de volta para o topo)
  import("../src/services/AuthService.ts").then(function (m) {
    if (destroyed) return;
    var lastUser;
    unsubscribeAuth = m.AuthService.onAuthStateChange(function (_event, session) {
      var user = session && session.user ? session.user.id : null;
      if (lastUser === undefined) { lastUser = user; return; }
      if (user === lastUser || destroyed) return;
      lastUser = user;
      setTimeout(function () {
        if (destroyed) return;
        if (tab === "mine") loadMine();
        else if (!viewer) loadFeed(true);
      }, 0);
    });
  });

  // ---------- início ----------
  (async function init() {
    await loadFeed(true);
    if (destroyed) return;
    var params = new URLSearchParams(location.search);
    var id = params.get("post");
    if (id) openSharedPost(id);
    else if (params.get("postar") === "1") {
      history.replaceState(null, "", "/comunidade");
      publish();
    }
  })();

  return function destroy() {
    destroyed = true;
    window.removeEventListener("popstate", onPopState);
    window.removeEventListener("resize", onResize);
    clearTimeout(resizeTimer);
    document.removeEventListener("keydown", onKeydown, true);
    if (sentinelObs) sentinelObs.disconnect();
    if (unsubscribeAuth) unsubscribeAuth();
    if (viewer) { var v = viewer; viewer = null; v.close(true); }
    var pub = document.querySelector("[data-sgc-publisher]");
    if (pub) pub.remove();
  };
}
