/* Street Goose 034 — /comunidade: a rede social da marca, no pique de um
   app de fotos. Feed em coluna (toque duplo curte), destaques em círculos no
   topo, "Em alta" em grade, perfil de cada membro (/comunidade?u=ID) com o
   "Meu perfil" mostrando também o que está em análise, post aberto com
   comentários (/comunidade?post=ID — voltar do navegador fecha) e o
   compositor de publicação. ?postar=1 abre o compositor. Só posts aprovados
   pela equipe aparecem para os outros. */
import "./community.css";
import {
  service, postCardHtml, gridTileHtml, toggleLike, sharePost, shareLink, profileUrl, openProduct, openViewer,
  startPublish, openMenu, burst, syncLike, timeAgo, avatarHtml, ringHtml, levelChipHtml, countLabel,
  emptyStateHtml, productFor, ICONS,
} from "./community-ui.js";

var PAGE_SIZE = 12;
var GRID_SIZE = 30;

export function mountCommunityPage(root, _params, onClose) {
  function esc(v) { return window.SG.esc(v == null ? "" : String(v)); }
  function toast(msg) { if (window.SG.toast) window.SG.toast(msg); }

  root.classList.add("is-community");
  root.innerHTML =
    '<div class="app-page-head sgc-top">' +
      '<button class="sgc-brand" type="button" data-view="feed" aria-label="SG Community — feed">' +
        '<span class="sgc-brand-mark" aria-hidden="true">SG</span><span class="sgc-brand-text">Community<small>034</small></span>' +
      "</button>" +
      '<div class="app-page-head-actions">' +
        '<button class="btn btn-primary sgc-head-publish" type="button" data-community-publish aria-label="Postar visual">' + ICONS.plus + "<span>Postar</span></button>" +
        '<button class="app-page-close" type="button" data-app-close aria-label="Fechar"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg></button>' +
      "</div>" +
    "</div>" +
    '<div class="sgc-app" data-community-body>' +
      '<div class="sgc-layout">' +
        '<main class="sgc-main">' +
          '<div class="sgc-notice-slot" data-notice></div>' +
          '<section class="sgc-stories" data-stories aria-label="Destaques da comunidade"></section>' +
          '<nav class="sgc-nav" role="tablist" aria-label="Seções da comunidade">' +
            '<button type="button" role="tab" data-view="feed" aria-selected="true">' + ICONS.home + "<span>Feed</span></button>" +
            '<button type="button" role="tab" data-view="top" aria-selected="false">' + ICONS.flame + "<span>Em alta</span></button>" +
            '<button type="button" role="tab" data-view="me" aria-selected="false">' + ICONS.user + '<span>Meu perfil</span><i class="sgc-dot" data-pending-dot hidden></i></button>' +
          "</nav>" +
          '<div class="sgc-view" data-view-root role="tabpanel"></div>' +
        "</main>" +
        '<aside class="sgc-side" data-side aria-label="Sua conta e a comunidade"></aside>' +
      "</div>" +
    "</div>";

  var viewEl = root.querySelector("[data-view-root]");
  var storiesEl = root.querySelector("[data-stories]");
  var sideEl = root.querySelector("[data-side]");
  var noticeEl = root.querySelector("[data-notice]");
  var destroyed = false;
  var seqs = { feed: 0, top: 0, profile: 0 };
  var view = "feed"; // feed | top | profile
  var profileId = null;
  var myId = null;
  var lists = { feed: [], top: [], profile: [], stories: [] };
  var more = { feed: false, top: false, profile: false };
  var busy = { feed: false, top: false, profile: false };
  var stats = null;
  var mine = [];
  var mineSeg = "live";
  var viewer = null;
  var viewerPushed = false;
  var pendingProfile = null;
  var sentinelObs = null;
  var unsubscribeAuth = null;

  // ---------- util ----------
  function allLists() { return [lists.feed, lists.top, lists.profile, lists.stories]; }
  function postById(id) {
    for (var i = 0; i < allLists().length; i++) {
      var f = allLists()[i].find(function (p) { return p.id === id; });
      if (f) return f;
    }
    return null;
  }
  // o mesmo post pode estar em mais de uma lista (feed, em alta, perfil)
  function eachCopy(id, fn) { allLists().forEach(function (l) { l.forEach(function (p) { if (p.id === id) fn(p); }); }); }
  function baseUrl() { return view === "profile" && profileId ? "/comunidade?u=" + encodeURIComponent(profileId) : "/comunidade"; }
  function skeletonCards(n) {
    var out = "";
    for (var i = 0; i < n; i++) out += '<div class="sgc-card sgc-card--skeleton" aria-hidden="true"><div class="sgc-sk sgc-sk--head"></div><div class="sgc-sk sgc-sk--media"></div><div class="sgc-sk sgc-sk--line"></div></div>';
    return out;
  }
  function skeletonGrid(n) {
    var out = '<div class="sgc-grid">';
    for (var i = 0; i < n; i++) out += '<span class="sgc-gridtile is-skeleton" aria-hidden="true"></span>';
    return out + "</div>";
  }

  // ---------- abas ----------
  function setTab(name) {
    root.querySelectorAll(".sgc-nav [data-view]").forEach(function (b) {
      b.setAttribute("aria-selected", b.getAttribute("data-view") === name ? "true" : "false");
    });
  }

  function selectView(next, opts) {
    opts = opts || {};
    if (next === "me") {
      if (!myId) { renderLoginGate(); setTab("me"); view = "gate"; return; }
      showProfile(myId, opts.push ? "push" : "replace");
      return;
    }
    if (next === view && !opts.force) { root.scrollTo({ top: 0, behavior: "smooth" }); return; }
    view = next;
    profileId = null;
    setTab(next);
    if (!opts.fromHistory) history.replaceState(null, "", "/comunidade");
    if (sentinelObs) sentinelObs.disconnect();
    if (next === "top") loadGrid(true);
    else loadFeed(true);
  }

  // ---------- feed ----------
  function renderFeedList() {
    viewEl.innerHTML = '<div class="sgc-feed" data-list="feed">' + lists.feed.map(function (p, i) { return postCardHtml(p, i); }).join("") + "</div>" + moreHtml(more.feed);
    watchSentinel();
  }
  function moreHtml(has) {
    return has ? '<div class="sgc-more" data-sentinel><span class="sgc-spinner" aria-hidden="true"></span><button class="btn btn-ghost" type="button" data-load-more>Carregar mais</button></div>' : "";
  }

  async function loadFeed(reset) {
    if (busy.feed && !reset) return false;
    var n = ++seqs.feed;
    busy.feed = true;
    if (reset) { lists.feed = []; more.feed = false; if (view === "feed") viewEl.innerHTML = '<div class="sgc-feed">' + skeletonCards(2) + "</div>"; }
    var svc = await service();
    if (!svc.isConfigured()) { busy.feed = false; if (view === "feed") viewEl.innerHTML = '<div class="app-page-empty"><h2>Comunidade indisponível agora.</h2></div>'; return false; }
    var res = await svc.getFeed({ sort: "recent", limit: PAGE_SIZE, offset: lists.feed.length });
    if (destroyed || n !== seqs.feed) return false;
    busy.feed = false;
    if (!res) {
      if (!lists.feed.length && view === "feed") viewEl.innerHTML = '<div class="app-page-empty"><h2>Não foi possível carregar o feed.</h2><button class="btn btn-ghost" type="button" data-retry>Tentar de novo</button></div>';
      return false;
    }
    stats = res.stats;
    var start = lists.feed.length;
    Array.prototype.push.apply(lists.feed, res.items); // no lugar: o post aberto enxerga os novos
    more.feed = res.items.length === PAGE_SIZE;
    if (start === 0) buildStories();
    renderSide();
    if (view !== "feed") return res.items.length > 0;
    if (!lists.feed.length) {
      viewEl.innerHTML = emptyStateHtml('<button class="btn btn-primary" type="button" data-community-publish>Postar meu visual</button>');
      return false;
    }
    var listEl = viewEl.querySelector('[data-list="feed"]');
    if (start === 0 || !listEl) renderFeedList();
    else {
      listEl.insertAdjacentHTML("beforeend", res.items.map(function (p, k) { return postCardHtml(p, k % 4); }).join(""));
      var s = viewEl.querySelector("[data-sentinel]");
      if (s && !more.feed) s.remove();
      watchSentinel();
    }
    if (viewer) viewer.refresh();
    return res.items.length > 0;
  }

  // ---------- em alta (grade) ----------
  async function loadGrid(reset) {
    if (busy.top && !reset) return false;
    var n = ++seqs.top;
    busy.top = true;
    if (reset) { lists.top = []; more.top = false; viewEl.innerHTML = '<p class="sgc-view-kicker">' + ICONS.flame + "Os visuais mais curtidos</p>" + skeletonGrid(9); }
    var svc = await service();
    var res = await svc.getFeed({ sort: "top", limit: GRID_SIZE, offset: lists.top.length });
    if (destroyed || n !== seqs.top) return false;
    busy.top = false;
    if (!res) { if (view === "top") viewEl.innerHTML = '<div class="app-page-empty"><h2>Não foi possível carregar.</h2><button class="btn btn-ghost" type="button" data-retry>Tentar de novo</button></div>'; return false; }
    var start = lists.top.length;
    Array.prototype.push.apply(lists.top, res.items);
    more.top = res.items.length === GRID_SIZE;
    if (view !== "top") return res.items.length > 0;
    if (!lists.top.length) { viewEl.innerHTML = emptyStateHtml('<button class="btn btn-primary" type="button" data-community-publish>Postar meu visual</button>'); return false; }
    if (start === 0) {
      viewEl.innerHTML = '<p class="sgc-view-kicker">' + ICONS.flame + "Os visuais mais curtidos</p>" +
        '<div class="sgc-grid" data-list="top">' + lists.top.map(function (p) { return gridTileHtml(p); }).join("") + "</div>" + moreHtml(more.top);
    } else {
      viewEl.querySelector('[data-list="top"]').insertAdjacentHTML("beforeend", res.items.map(function (p) { return gridTileHtml(p); }).join(""));
      var s = viewEl.querySelector("[data-sentinel]");
      if (s && !more.top) s.remove();
    }
    watchSentinel();
    if (viewer) viewer.refresh();
    return res.items.length > 0;
  }

  function watchSentinel() {
    if (sentinelObs) sentinelObs.disconnect();
    var s = viewEl.querySelector("[data-sentinel]");
    if (!s || !("IntersectionObserver" in window)) return;
    sentinelObs = new IntersectionObserver(function (entries) {
      if (!entries.some(function (en) { return en.isIntersecting; })) return;
      if (view === "feed" && more.feed) loadFeed(false);
      else if (view === "top" && more.top) loadGrid(false);
      else if (view === "profile" && more.profile) loadProfilePosts(false);
    }, { root: root, rootMargin: "700px 0px" });
    sentinelObs.observe(s);
  }

  // ---------- destaques (círculos) ----------
  function buildStories() {
    var seen = {};
    var picks = [];
    lists.feed.filter(function (p) { return p.featured; }).concat(lists.feed).forEach(function (p) {
      if (picks.length >= 14 || seen[p.author.id]) return;
      seen[p.author.id] = true;
      picks.push(p);
    });
    lists.stories = picks;
    var meItem = '<button class="sgc-story sgc-story--me" type="button" data-community-publish aria-label="Postar um visual">' +
      '<span class="sgc-story-ring">' + (myAuthor ? avatarHtml(myAuthor) : '<span class="sgc-avatar">' + ICONS.camera + "</span>") + '<i aria-hidden="true">' + ICONS.plus + "</i></span>" +
      "<span>Seu visual</span></button>";
    storiesEl.innerHTML = '<div class="sgc-stories-track">' + meItem + picks.map(function (p, i) {
      return '<button class="sgc-story' + (p.featured ? " is-hot" : "") + '" type="button" data-story="' + i + '" aria-label="' + esc("Ver visual de " + p.author.name) + '">' +
        '<span class="sgc-story-ring">' + (p.imageUrl ? '<span class="sgc-avatar sgc-story-thumb"><img src="' + esc(p.imageUrl) + '" alt="" loading="lazy" decoding="async"></span>' : avatarHtml(p.author)) + "</span>" +
        "<span>" + esc(p.author.name) + "</span></button>";
    }).join("") + "</div>";
    storiesEl.hidden = !picks.length && !myId;
  }

  // ---------- perfil ----------
  var profileData = null;
  async function showProfile(id, history_) {
    if (!id) return;
    var isMe = !!myId && id === myId;
    view = "profile";
    profileId = id;
    setTab(isMe ? "me" : "");
    if (history_ === "push") history.pushState({ sgProfile: id }, "", "/comunidade?u=" + encodeURIComponent(id));
    else if (history_ === "replace") history.replaceState({ sgProfile: id }, "", "/comunidade?u=" + encodeURIComponent(id));
    if (sentinelObs) sentinelObs.disconnect();
    root.scrollTo({ top: 0 });
    var n = ++seqs.profile;
    profileData = null;
    lists.profile = [];
    more.profile = false;
    viewEl.innerHTML = '<section class="sgc-profile is-loading"><div class="sgc-profile-top"><span class="sgc-sk sgc-sk--avatar"></span><div class="sgc-profile-id"><span class="sgc-sk sgc-sk--line"></span><span class="sgc-sk sgc-sk--line short"></span></div></div>' + skeletonGrid(6) + "</section>";
    var svc = await service();
    var results = await Promise.all([
      svc.getProfile(id),
      svc.getFeed({ author: id, sort: "recent", limit: GRID_SIZE }),
      isMe ? svc.getMine() : Promise.resolve(null),
    ]);
    if (destroyed || n !== seqs.profile || view !== "profile" || profileId !== id) return;
    var prof = results[0], feed = results[1];
    if (isMe && results[2]) { mine = results[2]; updatePendingDot(); }
    lists.profile = feed ? feed.items.slice() : [];
    more.profile = !!feed && feed.items.length === GRID_SIZE;
    if (!prof) {
      // sem a 0108 no banco (ou sem visual no ar): monta pelo que dá
      var a = lists.profile[0] ? lists.profile[0].author : (isMe ? myAuthor : null);
      if (!a) {
        viewEl.innerHTML = '<div class="app-page-empty"><h2>Perfil não encontrado.</h2><p>Esse membro ainda não tem visual no ar.</p><button class="btn btn-ghost" type="button" data-view="feed">Voltar ao feed</button></div>';
        return;
      }
      prof = { id: id, name: a.name, avatarUrl: a.avatarUrl, level: a.level, levelName: a.levelName, posts: lists.profile.length, likes: lists.profile.reduce(function (s, p) { return s + p.likeCount; }, 0), since: null, me: isMe };
    }
    profileData = prof;
    renderProfile();
  }

  async function loadProfilePosts() {
    if (busy.profile || !profileId) return false;
    var n = seqs.profile;
    busy.profile = true;
    var svc = await service();
    var res = await svc.getFeed({ author: profileId, sort: "recent", limit: GRID_SIZE, offset: lists.profile.length });
    busy.profile = false;
    if (destroyed || n !== seqs.profile || !res) return false;
    Array.prototype.push.apply(lists.profile, res.items);
    more.profile = res.items.length === GRID_SIZE;
    var grid = viewEl.querySelector('[data-list="profile"]');
    if (grid) grid.insertAdjacentHTML("beforeend", res.items.map(function (p) { return gridTileHtml(p); }).join(""));
    var s = viewEl.querySelector("[data-sentinel]");
    if (s && !more.profile) s.remove();
    if (viewer) viewer.refresh();
    return res.items.length > 0;
  }

  var STATUS = { pending: ["Em análise", "is-pending"], approved: ["No ar", "is-live"], rejected: ["Não aprovado", "is-rejected"] };
  function sinceLabel(iso) {
    if (!iso) return "";
    return "na SG desde " + new Date(iso).toLocaleDateString("pt-BR", { month: "short", year: "numeric" }).replace(".", "");
  }

  function renderProfile() {
    var p = profileData;
    var isMe = !!p.me || (!!myId && p.id === myId);
    var waiting = isMe ? mine.filter(function (m) { return m.status !== "approved"; }) : [];
    if (mineSeg === "waiting" && !waiting.length) mineSeg = "live";
    var gridHtml;
    if (isMe && mineSeg === "waiting") {
      gridHtml = '<div class="sgc-grid" data-list="waiting">' + waiting.map(function (m) {
        var st = STATUS[m.status] || ["", ""];
        return '<button class="sgc-gridtile" type="button" data-mine-open="' + esc(m.id) + '" aria-label="' + esc("Seu visual — " + st[0]) + '">' +
          (m.imageUrl ? '<img src="' + esc(m.imageUrl) + '" alt="" loading="lazy" decoding="async">' : "") +
          '<span class="sgc-status ' + st[1] + '">' + (m.status === "pending" ? ICONS.clock : "") + st[0] + "</span></button>";
      }).join("") + "</div>";
    } else if (lists.profile.length) {
      gridHtml = '<div class="sgc-grid" data-list="profile">' + lists.profile.map(function (x) { return gridTileHtml(x); }).join("") + "</div>" + moreHtml(more.profile);
    } else {
      gridHtml = '<div class="sgc-profile-empty">' + ICONS.camera +
        (isMe ? "<b>Seu primeiro visual começa aqui.</b><span>Poste usando a peça — a equipe aprova e você ganha +30 XP.</span><button class=\"btn btn-primary\" type=\"button\" data-community-publish>Postar visual</button>"
              : "<b>Nenhum visual no ar ainda.</b>") + "</div>";
    }
    viewEl.innerHTML =
      '<section class="sgc-profile">' +
        (isMe ? "" : '<button class="sgc-back" type="button" data-profile-back>' + ICONS.back + "Voltar</button>") +
        '<div class="sgc-profile-top">' +
          '<span class="sgc-ring sgc-ring--xl is-hot">' + avatarHtml(p) + "</span>" +
          '<div class="sgc-profile-id">' +
            '<div class="sgc-profile-name"><h2>' + esc(p.name) + "</h2>" + levelChipHtml(p) + "</div>" +
            '<p class="sgc-profile-sub">' + esc([p.levelName, sinceLabel(p.since)].filter(Boolean).join(" · ") || "Membro Street Goose") + "</p>" +
            '<ul class="sgc-profile-stats">' +
              "<li><b>" + countLabel(p.posts) + "</b><span>" + (p.posts === 1 ? "visual" : "visuais") + "</span></li>" +
              "<li><b>" + countLabel(p.likes) + "</b><span>curtidas</span></li>" +
              "<li><b>" + (p.level || 1) + "</b><span>nível</span></li>" +
            "</ul>" +
            '<div class="sgc-profile-actions">' +
              (isMe ? '<button class="btn btn-primary" type="button" data-community-publish>' + ICONS.plus + 'Postar visual</button><a class="btn btn-ghost" href="/conta">Editar perfil</a>'
                    : '<button class="btn btn-ghost" type="button" data-profile-share>' + ICONS.link + "Compartilhar perfil</button>") +
            "</div>" +
          "</div>" +
        "</div>" +
        (isMe ? '<div class="sgc-seg" role="tablist" aria-label="Seus visuais">' +
          '<button type="button" role="tab" data-seg="live" aria-selected="' + (mineSeg === "live") + '">' + ICONS.grid + "No ar<b>" + countLabel(lists.profile.length) + "</b></button>" +
          '<button type="button" role="tab" data-seg="waiting" aria-selected="' + (mineSeg === "waiting") + '"' + (waiting.length ? "" : " disabled") + ">" + ICONS.clock + "Em análise<b>" + waiting.length + "</b></button>" +
        "</div>" : '<div class="sgc-seg sgc-seg--solo">' + ICONS.grid + "Visuais</div>") +
        gridHtml +
      "</section>";
    watchSentinel();
  }

  function renderLoginGate() {
    if (sentinelObs) sentinelObs.disconnect();
    viewEl.innerHTML = '<div class="sgc-gate">' + ICONS.user + "<h2>Seu perfil na SG Community</h2><p>Entre para postar seus visuais, curtir, comentar e acompanhar a aprovação.</p>" +
      '<button class="btn btn-primary" type="button" data-login>Entrar</button></div>';
  }

  // ---------- meus posts em análise ----------
  function openMineSheet(id) {
    var m = mine.find(function (x) { return x.id === id; });
    if (!m) return;
    var st = STATUS[m.status] || ["", ""];
    var p = productFor(m.productId);
    var sheet = document.createElement("div");
    sheet.className = "sgc-sheet";
    sheet.setAttribute("role", "dialog");
    sheet.setAttribute("aria-modal", "true");
    sheet.setAttribute("aria-label", "Seu visual");
    sheet.innerHTML = '<div class="sgc-sheet-backdrop" data-sheet-close></div><div class="sgc-sheet-card">' +
      '<button class="sgc-icon sgc-sheet-x" type="button" data-sheet-close aria-label="Fechar">' + ICONS.close + "</button>" +
      '<div class="sgc-sheet-media">' + (m.imageUrl ? '<img src="' + esc(m.imageUrl) + '" alt="Seu visual">' : "") + '<span class="sgc-status ' + st[1] + '">' + st[0] + "</span></div>" +
      '<div class="sgc-sheet-body">' +
        (m.status === "pending" ? '<p class="kicker">EM ANÁLISE</p><h3>A equipe está conferindo.</h3><p>Quando aprovar, ele entra no feed e você ganha <b>+30 XP</b>.</p>'
          : '<p class="kicker">NÃO APROVADO</p><h3>Esse visual não entrou no feed.</h3>' + (m.rejectionReason ? '<p class="sgc-sheet-reason">Motivo: ' + esc(m.rejectionReason) + "</p>" : "<p>Tenta outra foto usando a peça, com boa luz.</p>")) +
        (m.caption ? '<p class="sgc-sheet-caption">“' + esc(m.caption) + "”</p>" : "") +
        (p ? '<p class="sgc-sheet-meta">' + ICONS.bag + esc(p.name) + "</p>" : "") +
        '<p class="sgc-sheet-meta">' + ICONS.clock + "Enviado " + esc(timeAgo(m.createdAt)) + "</p>" +
        '<div class="sgc-sheet-actions" data-sheet-actions><button class="btn btn-ghost sgc-danger-btn" type="button" data-sheet-delete>' + ICONS.trash + "Excluir</button></div>" +
      "</div></div>";
    document.body.appendChild(sheet);
    var opener = document.activeElement;
    function close() { document.removeEventListener("keydown", onKey, true); sheet.remove(); if (opener && opener.isConnected) opener.focus({ preventScroll: true }); }
    function onKey(e) { if (e.key === "Escape") { e.stopPropagation(); e.preventDefault(); close(); } }
    document.addEventListener("keydown", onKey, true);
    sheet.addEventListener("click", async function (e) {
      if (e.target.closest("[data-sheet-close]")) { close(); return; }
      if (e.target.closest("[data-sheet-delete]")) {
        sheet.querySelector("[data-sheet-actions]").innerHTML = '<span class="sgc-confirm">Excluir de vez?</span><button class="btn btn-primary" type="button" data-sheet-delete-yes>Sim, excluir</button><button class="btn btn-ghost" type="button" data-sheet-delete-no>Cancelar</button>';
        return;
      }
      if (e.target.closest("[data-sheet-delete-no]")) { sheet.querySelector("[data-sheet-actions]").innerHTML = '<button class="btn btn-ghost sgc-danger-btn" type="button" data-sheet-delete>' + ICONS.trash + "Excluir</button>"; return; }
      var yes = e.target.closest("[data-sheet-delete-yes]");
      if (yes) {
        yes.disabled = true;
        var svc = await service();
        var ok = await svc.deleteMine(m.id);
        toast(ok ? "VISUAL EXCLUÍDO" : "NÃO FOI POSSÍVEL EXCLUIR AGORA");
        if (ok) { mine = mine.filter(function (x) { return x.id !== m.id; }); updatePendingDot(); close(); if (view === "profile" && profileData) renderProfile(); }
      }
    });
    sheet.querySelector("[data-sheet-close].sgc-sheet-x").focus();
  }

  // ---------- confirmar exclusão de post no ar ----------
  function confirmBox(title, text, okLabel) {
    return new Promise(function (resolve) {
      var box = document.createElement("div");
      box.className = "sgc-sheet sgc-sheet--confirm";
      box.setAttribute("role", "alertdialog");
      box.setAttribute("aria-modal", "true");
      box.innerHTML = '<div class="sgc-sheet-backdrop" data-no></div><div class="sgc-sheet-card"><div class="sgc-sheet-body"><h3>' + esc(title) + "</h3><p>" + esc(text) + "</p>" +
        '<div class="sgc-sheet-actions"><button class="btn btn-primary" type="button" data-yes>' + esc(okLabel) + '</button><button class="btn btn-ghost" type="button" data-no>Cancelar</button></div></div></div>';
      document.body.appendChild(box);
      var opener = document.activeElement;
      function done(v) { document.removeEventListener("keydown", onKey, true); box.remove(); if (opener && opener.isConnected) opener.focus({ preventScroll: true }); resolve(v); }
      function onKey(e) { if (e.key === "Escape") { e.stopPropagation(); e.preventDefault(); done(false); } }
      document.addEventListener("keydown", onKey, true);
      box.addEventListener("click", function (e) { if (e.target.closest("[data-yes]")) done(true); else if (e.target.closest("[data-no]")) done(false); });
      box.querySelector("[data-no].btn").focus();
    });
  }

  async function deleteLivePost(post) {
    var ok = await confirmBox("Excluir este visual?", "Ele sai do feed, do seu perfil e leva junto curtidas e comentários. Não dá para desfazer.", "Excluir");
    if (!ok) return;
    var svc = await service();
    var done = await svc.deleteMine(post.id);
    if (destroyed) return;
    toast(done ? "VISUAL EXCLUÍDO" : "NÃO FOI POSSÍVEL EXCLUIR AGORA");
    if (!done) return;
    ["feed", "top", "profile", "stories"].forEach(function (k) { lists[k] = lists[k].filter(function (p) { return p.id !== post.id; }); });
    root.querySelectorAll('[data-post="' + CSS.escape(post.id) + '"], [data-open-post="' + CSS.escape(post.id) + '"].sgc-gridtile').forEach(function (n) { n.remove(); });
    if (profileData && profileData.me) profileData.posts = Math.max(0, profileData.posts - 1);
    buildStories();
  }

  // ---------- lateral ----------
  var myAuthor = null;
  var xp = null;
  function renderSide() {
    var meCard = myAuthor
      ? '<div class="sgc-side-card sgc-me">' +
          '<button class="sgc-author" type="button" data-view="me">' + ringHtml(myAuthor, true) +
            '<span class="sgc-author-text"><b>' + esc(myAuthor.name) + "</b><small>" + esc(xp ? xp.level.name : "Membro Street Goose") + "</small></span></button>" +
          (xp ? '<div class="sgc-xp"><div class="sgc-xp-row"><span>NV ' + xp.level.levelNumber + "</span><span>" + (xp.nextLevel ? xp.xpToNext + " XP para o NV " + xp.nextLevel.levelNumber : "Nível máximo") + "</span></div>" +
            '<div class="sgc-xp-bar"><span style="width:' + Math.max(4, xp.progressPct) + '%"></span></div></div>' : "") +
        "</div>"
      : '<div class="sgc-side-card sgc-join"><p class="kicker">SG COMMUNITY</p><h3>Entre na comunidade.</h3><p>Poste seus visuais, curta e comente os da galera.</p><button class="btn btn-primary" type="button" data-login>Entrar</button></div>';
    var creators = topCreators();
    sideEl.innerHTML = meCard +
      '<div class="sgc-side-card sgc-post-cta"><span class="sgc-post-cta-icon" aria-hidden="true">' + ICONS.camera + "</span><div><b>Poste seu visual</b><span>+30 XP quando a equipe aprovar</span></div>" +
        '<button class="btn btn-primary" type="button" data-community-publish>Postar</button></div>' +
      (stats ? '<div class="sgc-side-card sgc-side-stats"><div><b>' + countLabel(stats.posts) + "</b><span>visuais</span></div><div><b>" + countLabel(stats.members) + "</b><span>membros</span></div><div><b>" + countLabel(stats.likes) + "</b><span>curtidas</span></div></div>" : "") +
      (creators.length ? '<div class="sgc-side-card"><p class="sgc-side-title">Criadores em alta</p><ul class="sgc-creators">' + creators.map(function (c, i) {
        return '<li><button type="button" data-profile="' + esc(c.author.id) + '"><span class="sgc-creator-n">' + (i + 1) + "</span>" + avatarHtml(c.author) +
          '<span class="sgc-creator-who"><b>' + esc(c.author.name) + "</b><small>" + countLabel(c.likes) + (c.likes === 1 ? " curtida" : " curtidas") + "</small></span></button></li>";
      }).join("") + "</ul></div>" : "") +
      '<p class="sgc-side-foot">Feed com curadoria: todo visual passa pela equipe Street Goose antes de entrar.</p>';
  }
  function topCreators() {
    var by = {};
    lists.feed.concat(lists.top).forEach(function (p) {
      var k = p.author.id;
      if (!by[k]) by[k] = { author: p.author, likes: 0, ids: {} };
      if (by[k].ids[p.id]) return;
      by[k].ids[p.id] = true;
      by[k].likes += p.likeCount;
    });
    return Object.keys(by).map(function (k) { return by[k]; }).sort(function (a, b) { return b.likes - a.likes; }).slice(0, 5);
  }

  // ---------- aviso de aprovação ----------
  function statusKey() { return "sgcStatus:" + myId; }
  function checkApprovals() {
    if (!myId || !mine) return;
    var prev = null;
    try { prev = JSON.parse(localStorage.getItem(statusKey()) || "null"); } catch (e) { prev = null; }
    var now = {};
    mine.forEach(function (m) { now[m.id] = m.status; });
    try { localStorage.setItem(statusKey(), JSON.stringify(now)); } catch (e) { /* aba anônima: sem aviso, sem problema */ }
    if (!prev) return;
    var approved = mine.filter(function (m) { return m.status === "approved" && prev[m.id] && prev[m.id] !== "approved"; });
    var rejected = mine.filter(function (m) { return m.status === "rejected" && prev[m.id] === "pending"; });
    if (approved.length) showNotice(approved[0], "approved", approved.length);
    else if (rejected.length) showNotice(rejected[0], "rejected", rejected.length);
  }
  function showNotice(m, kind, n) {
    noticeEl.innerHTML = '<div class="sgc-notice is-' + kind + '" role="status">' +
      (m.imageUrl ? '<img src="' + esc(m.imageUrl) + '" alt="">' : "") +
      "<div><b>" + (kind === "approved" ? (n > 1 ? n + " visuais seus foram aprovados." : "Seu visual foi aprovado e já está no feed.") : "Um visual seu não foi aprovado.") + "</b>" +
      "<span>" + (kind === "approved" ? "+30 XP na sua conta" + (n > 1 ? " por visual" : "") + "." : "Veja o motivo no seu perfil.") + "</span></div>" +
      '<button class="btn ' + (kind === "approved" ? "btn-primary" : "btn-ghost") + '" type="button" data-notice-go="' + kind + '" data-notice-id="' + esc(m.id) + '">' + (kind === "approved" ? "Ver" : "Ver motivo") + "</button>" +
      '<button class="sgc-icon" type="button" data-notice-close aria-label="Dispensar aviso">' + ICONS.close + "</button></div>";
  }
  function updatePendingDot() {
    var dot = root.querySelector("[data-pending-dot]");
    if (dot) dot.hidden = !mine.some(function (m) { return m.status === "pending"; });
  }

  // ---------- quem está logado ----------
  async function loadMe() {
    var svc = await service();
    var id = await svc.getMyId();
    if (destroyed) return;
    myId = id;
    myAuthor = null;
    xp = null;
    mine = [];
    if (!id) { renderSide(); buildStories(); updatePendingDot(); return; }
    var res = await Promise.all([
      svc.getProfile(id),
      svc.getMine(),
      import("../src/services/RewardsService.ts").then(function (m) { return m.RewardsService.getMyXpStatus(); }).catch(function () { return null; }),
      svc.getMyPublicName(),
    ]);
    if (destroyed || myId !== id) return;
    var prof = res[0];
    mine = res[1] || [];
    xp = res[2];
    myAuthor = prof ? { id: id, name: prof.name, avatarUrl: prof.avatarUrl, level: prof.level, levelName: prof.levelName }
                    : { id: id, name: res[3] || "Você", avatarUrl: null, level: xp ? xp.level.levelNumber : 1, levelName: xp ? xp.level.name : null };
    renderSide();
    buildStories();
    updatePendingDot();
    checkApprovals();
  }

  // ---------- post aberto + histórico ----------
  function listFor(el) {
    var kind = el && el.closest("[data-list]") ? el.closest("[data-list]").getAttribute("data-list") : null;
    if (kind && lists[kind]) return kind;
    return view === "top" ? "top" : view === "profile" ? "profile" : "feed";
  }
  function postParam() { return new URLSearchParams(location.search).get("post"); }

  function openPost(id, push, kind, focusComment) {
    kind = kind || listFor(null);
    var list = lists[kind];
    var i = list.findIndex(function (p) { return p.id === id; });
    if (i === -1) {
      kind = ["feed", "top", "profile", "stories"].find(function (k) { return lists[k].some(function (p) { return p.id === id; }); });
      if (!kind) return false;
      list = lists[kind];
      i = list.findIndex(function (p) { return p.id === id; });
    }
    if (viewer) { viewer.show(i); return true; }
    viewerPushed = !!push;
    if (push) history.pushState({ sgPost: id }, "", "/comunidade?post=" + encodeURIComponent(id));
    viewer = openViewer({
      posts: list,
      index: i,
      focusComment: !!focusComment,
      hasMore: function () { return kind !== "stories" && !!more[kind]; },
      loadMore: function () {
        if (kind === "feed") return loadFeed(false);
        if (kind === "top") return loadGrid(false);
        if (kind === "profile") return loadProfilePosts(false);
        return Promise.resolve(false);
      },
      onIndex: function (idx) {
        var p = list[idx];
        if (p) history.replaceState(history.state, "", "/comunidade?post=" + encodeURIComponent(p.id));
      },
      onProfile: function (aid) { pendingProfile = aid; },
      onClose: function (fromHistory) {
        viewer = null;
        if (pendingProfile) {
          var pid = pendingProfile;
          pendingProfile = null;
          if (viewerPushed) history.replaceState({ sgProfile: pid }, "", "/comunidade?u=" + encodeURIComponent(pid));
          else history.pushState({ sgProfile: pid }, "", "/comunidade?u=" + encodeURIComponent(pid));
          viewerPushed = false;
          showProfile(pid, null);
          return;
        }
        if (fromHistory) return;
        if (viewerPushed) history.back();
        else history.replaceState(null, "", baseUrl());
        viewerPushed = false;
      },
    });
    return true;
  }

  // link compartilhado: o post pode não estar na primeira página do feed
  async function openSharedPost(id, push) {
    if (openPost(id, !!push)) return;
    var svc = await service();
    var res = await svc.getFeed({ postId: id, limit: 1 });
    if (destroyed) return;
    if (!res || !res.items.length) {
      history.replaceState(null, "", baseUrl());
      toast("ESSE VISUAL NÃO ESTÁ MAIS NO AR");
      return;
    }
    var p = res.items[0];
    if (!lists.feed.some(function (x) { return x.id === p.id; })) {
      lists.feed.unshift(p);
      if (view === "feed") renderFeedList();
    }
    openPost(p.id, !!push, "feed");
  }

  function onPopState() {
    var params = new URLSearchParams(location.search);
    var id = params.get("post");
    var u = params.get("u");
    if (!id && viewer) { viewer.close(true); }
    if (id) {
      if (!viewer) openSharedPost(id);
      else { var p = postById(id); if (p) openPost(id, false); }
      return;
    }
    if (u) { if (!(view === "profile" && profileId === u)) showProfile(u, null); return; }
    if (view === "profile") selectView("feed", { fromHistory: true, force: true });
  }
  window.addEventListener("popstate", onPopState);

  // ---------- ações ----------
  function publish() {
    startPublish({
      onShowMine: function () { mineSeg = "waiting"; selectView("me"); },
      onPublished: function () {
        service().then(function (svc) { return svc.getMine(); }).then(function (list) {
          if (destroyed) return;
          mine = list || [];
          updatePendingDot();
          try { var now = {}; mine.forEach(function (m) { now[m.id] = m.status; }); localStorage.setItem(statusKey(), JSON.stringify(now)); } catch (e) { /* sem storage */ }
          if (view === "profile" && profileData && profileData.me) renderProfile();
        });
      },
    });
  }

  function like(post, onlyLike, mediaEl) {
    if (onlyLike && mediaEl) burst(mediaEl.querySelector("[data-burst]"));
    toggleLike(post, onlyLike).then(function () {
      eachCopy(post.id, function (c) { if (c !== post) { c.liked = post.liked; c.likeCount = post.likeCount; } });
      syncLike(post);
    });
  }

  function postMenu(btn, post) {
    var items = [
      { label: "Ver perfil", icon: ICONS.user, onSelect: function () { showProfile(post.author.id, "push"); } },
      { label: "Copiar link", icon: ICONS.link, onSelect: function () { shareLink(location.origin + "/comunidade?post=" + encodeURIComponent(post.id), "", "", "LINK DO VISUAL COPIADO"); } },
      { label: "Compartilhar", icon: ICONS.share, onSelect: function () { sharePost(post); } },
    ];
    if (productFor(post.productId)) items.splice(1, 0, { label: "Ver a peça", icon: ICONS.bag, onSelect: function () { openProduct(post.productId); } });
    if (post.mine) items.push({ label: "Excluir visual", icon: ICONS.trash, danger: true, onSelect: function () { deleteLivePost(post); } });
    openMenu(btn, items);
  }

  var openTimer = null;
  root.addEventListener("click", async function (e) {
    var t = e.target;
    if (t.closest("[data-app-close]")) { onClose(); return; }
    if (t.closest("[data-community-publish]")) { publish(); return; }
    var viewBtn = t.closest("[data-view]");
    if (viewBtn) { selectView(viewBtn.getAttribute("data-view")); return; }
    if (t.closest("[data-profile-back]")) { if (history.state && history.state.sgProfile) history.back(); else selectView("feed", { force: true }); return; }
    var open = t.closest("[data-open-post]");
    if (open) {
      var id = open.getAttribute("data-open-post");
      var kind = listFor(open);
      var card = open.closest(".sgc-card");
      if (card && e.detail === 2) {
        clearTimeout(openTimer); openTimer = null;
        var lp = postById(id);
        if (lp) like(lp, true, card.querySelector(".sgc-card-media"));
        return;
      }
      if (card && e.detail === 1) {
        clearTimeout(openTimer);
        openTimer = setTimeout(function () { openTimer = null; openPost(id, true, kind); }, 260);
        return;
      }
      openPost(id, true, kind);
      return;
    }
    var likeBtn = t.closest("[data-like]");
    if (likeBtn) { var p1 = postById(likeBtn.getAttribute("data-like")); if (p1) like(p1, false); return; }
    var com = t.closest("[data-comments]");
    if (com) { openPost(com.getAttribute("data-comments"), true, listFor(com), true); return; }
    var share = t.closest("[data-share]");
    if (share) { var sp = postById(share.getAttribute("data-share")); if (sp) sharePost(sp); return; }
    var prod = t.closest("[data-product]");
    if (prod) { openProduct(prod.getAttribute("data-product")); return; }
    var prof = t.closest("[data-profile]");
    if (prof) { showProfile(prof.getAttribute("data-profile"), "push"); return; }
    var menuBtn = t.closest("[data-post-menu]");
    if (menuBtn) { var mp = postById(menuBtn.getAttribute("data-post-menu")); if (mp) postMenu(menuBtn, mp); return; }
    var exp = t.closest("[data-expand]");
    if (exp) { var cap = exp.closest("[data-caption]"); cap.classList.remove("is-clamped"); exp.remove(); return; }
    var story = t.closest("[data-story]");
    if (story) { var sp2 = lists.stories[Number(story.getAttribute("data-story"))]; if (sp2) openPost(sp2.id, true, "stories"); return; }
    var seg = t.closest("[data-seg]");
    if (seg && !seg.disabled) { mineSeg = seg.getAttribute("data-seg"); renderProfile(); return; }
    var mineOpen = t.closest("[data-mine-open]");
    if (mineOpen) { openMineSheet(mineOpen.getAttribute("data-mine-open")); return; }
    if (t.closest("[data-profile-share]") && profileData) { shareLink(profileUrl(profileData.id), "SG Community — Street Goose 034", profileData.name + " na SG Community", "LINK DO PERFIL COPIADO"); return; }
    var notice = t.closest("[data-notice-go]");
    if (notice) {
      var kind2 = notice.getAttribute("data-notice-go"), nid = notice.getAttribute("data-notice-id");
      noticeEl.innerHTML = "";
      if (kind2 === "approved") { openSharedPost(nid, true); }
      else { mineSeg = "waiting"; selectView("me"); }
      return;
    }
    if (t.closest("[data-notice-close]")) { noticeEl.innerHTML = ""; return; }
    if (t.closest("[data-load-more]")) {
      if (view === "feed") loadFeed(false); else if (view === "top") loadGrid(false); else if (view === "profile") loadProfilePosts(false);
      return;
    }
    if (t.closest("[data-retry]")) { selectView(view === "top" ? "top" : "feed", { force: true }); return; }
    if (t.closest("[data-login]")) { if (window.SG.auth) window.SG.auth.open(); return; }
  });

  // teclado no card: Enter/Espaço na foto abre (o botão invisível cobre a foto)
  function onKeydown(e) {
    if (e.key !== "Escape" || viewer) return;
    if (document.querySelector("[data-sgc-publisher], [data-sgc-menu], .sgc-sheet, .quickview.is-open, .auth-modal:not([hidden])")) return;
    onClose();
  }
  // captura: roda antes do ESC do login, enquanto ele ainda está aberto (senão
  // fechar o login com ESC fechava a página inteira junto)
  document.addEventListener("keydown", onKeydown, true);

  // login/logout sem sair da página: curtidas, comentários e "Meu perfil" mudam
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
        loadMe().then(function () {
          if (destroyed || viewer) return;
          if (view === "gate" && myId) showProfile(myId, "replace");
          else if (view === "profile" && profileId) showProfile(profileId, null);
          else if (view === "top") loadGrid(true);
          else loadFeed(true);
        });
      }, 0);
    });
  });

  // ---------- início ----------
  (async function init() {
    var params = new URLSearchParams(location.search);
    var u = params.get("u");
    var meP = loadMe();
    if (u) { await meP; if (destroyed) return; showProfile(u, null); await loadFeed(true); }
    else { await loadFeed(true); await meP; }
    if (destroyed) return;
    var id = params.get("post");
    if (id) openSharedPost(id);
    else if (params.get("postar") === "1") {
      history.replaceState(null, "", baseUrl());
      publish();
    }
  })();

  return function destroy() {
    destroyed = true;
    root.classList.remove("is-community");
    clearTimeout(openTimer);
    window.removeEventListener("popstate", onPopState);
    document.removeEventListener("keydown", onKeydown, true);
    if (sentinelObs) sentinelObs.disconnect();
    if (unsubscribeAuth) unsubscribeAuth();
    if (viewer) { var v = viewer; viewer = null; v.close(true); }
    ["[data-sgc-publisher]", "[data-sgc-menu]", ".sgc-sheet"].forEach(function (sel) { var n = document.querySelector(sel); if (n) n.remove(); });
    document.documentElement.classList.remove("sgc-lightbox-open");
  };
}
