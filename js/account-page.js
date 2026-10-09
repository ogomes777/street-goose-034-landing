/* Street Goose 034 — /conta e /conta/pedidos: área do cliente completa.
   Abas: Visão geral, Pedidos, Favoritos, Nível & XP, Cupons, Perfil,
   Preferências e Segurança — tudo com dado real do backend (RLS: cada
   cliente só lê o que é dele). Sem Supabase/sessão, estado honesto de login.
   Estilo em account-page.css (carregado só quando a página abre). */
import "./account-page.css";

export function mountAccountPage(root, _params, onClose) {
  var esc = window.SG.esc;
  function t(key) { return (window.SG.i18n && window.SG.i18n.t(key)) || key; }
  function money(c) { return window.SG.formatPrice(c || 0); }
  function fmtDate(iso, opts) {
    try { return new Date(iso).toLocaleDateString("pt-BR", opts || { day: "2-digit", month: "short", year: "numeric" }); } catch (e) { return ""; }
  }

  var ICON = {
    overview: '<path d="M3 13h8V3H3zM13 21h8V11h-8zM13 3v6h8V3zM3 21h8v-6H3z"/>',
    orders: '<path d="M4 7.5 12 3l8 4.5v9L12 21l-8-4.5v-9Z"/><path d="m4 7.5 8 4.5 8-4.5M12 12v9"/>',
    favorites: '<path d="M12 20.5s-7.5-4.6-10-9.4C.4 7.6 2 4 5.6 4 8 4 10 5.4 12 8c2-2.6 4-4 6.4-4C22 4 23.6 7.6 22 11.1 19.5 15.9 12 20.5 12 20.5z"/>',
    level: '<path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0V4Z"/><path d="M17 5h3v2a3 3 0 0 1-3 3M7 5H4v2a3 3 0 0 0 3 3"/>',
    coupons: '<path d="M3 9a3 3 0 0 0 0 6v3a1 1 0 0 0 1 1h16a1 1 0 0 0 1-1v-3a3 3 0 0 1 0-6V6a1 1 0 0 0-1-1H4a1 1 0 0 0-1 1Z"/><path d="M14 5v14" stroke-dasharray="2 3"/>',
    profile: '<path d="M12 12a4.5 4.5 0 1 0 0-9 4.5 4.5 0 0 0 0 9ZM4 21c1.5-4.2 5-6 8-6s6.5 1.8 8 6"/>',
    prefs: '<circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M2 12h3M19 12h3M4.9 19.1 7 17M17 7l2.1-2.1"/>',
    security: '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z"/><path d="m9 12 2 2 4-4"/>',
    close: '<path d="M6 6l12 12M18 6L6 18"/>',
    arrow: '<path d="M5 12h14M13 6l6 6-6 6"/>',
    copy: '<rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15V5a2 2 0 0 1 2-2h10"/>',
    bag: '<path d="M6 7h12l1 13H5L6 7Z"/><path d="M9 7a3 3 0 0 1 6 0"/>',
    chat: '<path d="M4 20l1.3-3.9A8 8 0 1 1 8 19z"/>',
    check: '<path d="M5 13l4 4L19 7"/>',
    lock: '<rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>',
    download: '<path d="M12 3v12M7 10l5 5 5-5M5 21h14"/>',
    out: '<path d="M15 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3M10 17l5-5-5-5M15 12H3"/>'
  };
  function ico(name, cls) { return '<svg class="' + (cls || "acp-ico") + '" viewBox="0 0 24 24" aria-hidden="true">' + ICON[name] + "</svg>"; }

  var TABS = [
    { id: "overview", label: "Visão geral", icon: "overview" },
    { id: "orders", label: "Pedidos", icon: "orders" },
    { id: "favorites", label: "Favoritos", icon: "favorites" },
    { id: "level", label: "Nível & XP", icon: "level" },
    { id: "coupons", label: "Cupons", icon: "coupons" },
    { id: "profile", label: "Perfil", icon: "profile" },
    { id: "prefs", label: "Preferências", icon: "prefs" },
    { id: "security", label: "Segurança", icon: "security" }
  ];
  var STATUS = {
    pending_payment: { label: "Aguardando pagamento", tone: "amber" },
    paid: { label: "Pago", tone: "blue" },
    fulfilled: { label: "Enviado", tone: "green" },
    cancelled: { label: "Cancelado", tone: "grey" },
    refunded: { label: "Reembolsado", tone: "violet" }
  };
  var XP_REASONS = { order_paid: "Pedido pago", community_post_approved: "Foto aprovada na comunidade", review_approved: "Avaliação aprovada", promo: "Promoção" };
  var HANDLE_RE = /^[A-Za-z0-9_.]{3,24}$/;
  var NOTIF = [
    { key: "orderUpdates", label: "Atualizações de pedido", hint: "Pagamento confirmado, envio e rastreio" },
    { key: "couponUnlocked", label: "Cupom liberado", hint: "Quando um cupom novo fica disponível pra você" },
    { key: "rewardUnlocked", label: "Recompensa desbloqueada", hint: "Quando seu nível libera um benefício" },
    { key: "levelUp", label: "Subiu de nível", hint: "Aviso quando você muda de nível" },
    { key: "postApproved", label: "Foto aprovada", hint: "Quando sua foto entra na comunidade" },
    { key: "newsletter", label: "Novidades e drops", hint: "Peças novas e campanhas da Street Goose" }
  ];

  var destroyed = false;
  var session = null, supa = null;
  var svc = {};
  var data = { xp: null, orders: null, redemptions: null, profile: null, levels: null, rewards: null, history: null, ranking: null, notif: null };
  var activeTab = location.pathname.indexOf("/pedidos") !== -1 ? "orders" : "overview";
  var orderFilter = "all";

  root.classList.add("is-account");
  root.innerHTML =
    '<div class="acp-head">' +
      '<div class="acp-head-title"><span class="acp-head-mark">' + ico("profile") + '</span><h1>' + esc(t("account.title")) + "</h1></div>" +
      '<button class="acp-close" type="button" data-app-close aria-label="' + esc(t("common.close")) + '">' + ico("close") + "</button>" +
    "</div>" +
    '<div class="acp-body" data-acp-body><div class="acp-skeleton"><span></span><span></span><span></span></div></div>';
  var bodyEl = root.querySelector("[data-acp-body]");

  function toast(msg) { if (window.SG.toast) window.SG.toast(msg); }
  async function copy(text, msg) {
    try { await navigator.clipboard.writeText(text); toast(msg || "COPIADO"); } catch (e) { toast("NÃO FOI POSSÍVEL COPIAR"); }
  }

  /* ---------------- carregamento ---------------- */
  async function init() {
    var authMod = await import("../src/services/AuthService.ts");
    if (destroyed) return;
    if (!authMod.AuthService.isConfigured()) { renderGuest(t("auth.notConfigured")); return; }
    session = await authMod.AuthService.getSession();
    if (destroyed) return;
    if (!session) { renderGuest(); return; }
    svc.auth = authMod.AuthService;
    var mods = await Promise.all([
      import("../src/services/RewardsService.ts"),
      import("../src/services/ProfileService.ts"),
      import("../src/services/NotificationService.ts"),
      import("../src/lib/supabase.ts")
    ]);
    svc.rewards = mods[0].RewardsService;
    svc.profile = mods[1].ProfileService;
    svc.notif = mods[2].NotificationService;
    supa = mods[3].supabase;
    var core = await Promise.all([svc.rewards.getMyXpStatus(), loadOrders(), svc.rewards.getMyRedemptions(), svc.profile.getMine()]);
    if (destroyed) return;
    data.xp = core[0]; data.orders = core[1]; data.redemptions = core[2]; data.profile = core[3];
    renderShell();
    showTab(activeTab, true);
  }

  async function loadOrders() {
    if (!supa) return [];
    var res = await supa.from("orders")
      .select("id, status, subtotal_cents, discount_cents, shipping_cents, total_cents, coupon_code, tracking_code, payment_method, created_at, order_items(count)")
      .order("created_at", { ascending: false });
    if (res.error || !res.data) return [];
    return res.data;
  }

  function renderGuest(msg) {
    bodyEl.innerHTML =
      '<div class="acp-guest">' +
        '<span class="acp-guest-icon">' + ico("profile") + "</span>" +
        "<h2>" + esc(msg || "Entre pra ver sua conta") + "</h2>" +
        "<p>Pedidos, favoritos, XP, cupons e preferências num lugar só.</p>" +
        '<button class="acp-btn acp-btn--primary" type="button" data-acp-login>' + esc(t("auth.submitSignIn")) + "</button>" +
      "</div>";
  }

  /* ---------------- identidade + abas ---------------- */
  function identity() {
    var u = session.user, meta = u.user_metadata || {};
    var name = (data.profile && data.profile.displayName) || meta.name || meta.full_name || u.email || "Membro Street Goose";
    var avatar = typeof meta.avatar_url === "string" && /^https:\/\//.test(meta.avatar_url) ? meta.avatar_url : null;
    var provider = (u.app_metadata && u.app_metadata.provider) || "email";
    return { name: name, email: u.email || "", avatar: avatar, provider: provider, since: u.created_at };
  }
  function providerLabel(p) { return p === "google" ? "Google" : p === "apple" ? "Apple" : "E-mail e senha"; }

  function ringHtml() {
    var xp = data.xp;
    var pct = xp ? Math.max(0, Math.min(100, xp.progressPct)) : 0;
    var C = 2 * Math.PI * 34;
    return (
      '<div class="acp-ring" style="--ring-off:' + (C * (1 - pct / 100)).toFixed(1) + ";--ring-c:" + C.toFixed(1) + '">' +
        '<svg viewBox="0 0 80 80" aria-hidden="true"><circle class="acp-ring-track" cx="40" cy="40" r="34"/><circle class="acp-ring-fill" cx="40" cy="40" r="34"/></svg>' +
        '<span class="acp-ring-num">' + (xp ? xp.level.levelNumber : 1) + "<small>nível</small></span>" +
      "</div>"
    );
  }

  function renderShell() {
    var id = identity();
    var xp = data.xp;
    bodyEl.innerHTML =
      '<section class="acp-hero">' +
        '<div class="acp-hero-id">' +
          '<span class="acp-avatar">' + (id.avatar ? '<img src="' + esc(id.avatar) + '" alt="" referrerpolicy="no-referrer">' : esc(id.name.charAt(0).toUpperCase())) + "</span>" +
          '<div class="acp-hero-text">' +
            '<p class="acp-kicker">STREET GOOSE 034 · MEMBRO</p>' +
            '<h2 class="acp-name">' + esc(id.name) + "</h2>" +
            '<p class="acp-email">' + esc(id.email) + "</p>" +
            '<div class="acp-chips">' +
              '<span class="acp-chip">Membro desde ' + esc(fmtDate(id.since, { month: "short", year: "numeric" })) + "</span>" +
              '<span class="acp-chip">Login: ' + esc(providerLabel(id.provider)) + "</span>" +
              (xp ? '<span class="acp-chip acp-chip--accent">' + esc(xp.level.name) + "</span>" : "") +
            "</div>" +
          "</div>" +
        "</div>" +
        '<button class="acp-hero-level" type="button" data-acp-tab="level">' +
          ringHtml() +
          '<span class="acp-hero-level-text"><b>' + (xp ? xp.totalXp : 0) + " XP</b>" +
          "<small>" + esc(xp ? (xp.nextLevel ? xp.xpToNext + " XP para " + xp.nextLevel.name : "Nível máximo alcançado") : "Seu XP aparece aqui") + "</small></span>" +
        "</button>" +
      "</section>" +
      '<nav class="acp-tabs" role="tablist" aria-label="Seções da conta">' +
        TABS.map(function (tab) {
          return '<button class="acp-tab" type="button" role="tab" id="acp-tab-' + tab.id + '" aria-controls="acp-panel" aria-selected="false" data-acp-tab="' + tab.id + '">' + ico(tab.icon) + "<span>" + esc(tab.label) + "</span></button>";
        }).join("") +
      "</nav>" +
      '<div class="acp-panel" id="acp-panel" role="tabpanel" data-acp-panel tabindex="-1"></div>';
  }

  function showTab(id, initial) {
    activeTab = id;
    bodyEl.querySelectorAll("[data-acp-tab].acp-tab").forEach(function (b) {
      var on = b.getAttribute("data-acp-tab") === id;
      b.classList.toggle("is-active", on);
      b.setAttribute("aria-selected", on ? "true" : "false");
      if (on && b.scrollIntoView && !initial) b.scrollIntoView({ block: "nearest", inline: "center", behavior: "smooth" });
    });
    var panel = bodyEl.querySelector("[data-acp-panel]");
    if (!panel) return;
    panel.setAttribute("aria-labelledby", "acp-tab-" + id);
    try { history.replaceState(history.state, "", id === "orders" ? "/conta/pedidos" : "/conta"); } catch (e) {}
    var fn = { overview: tabOverview, orders: tabOrders, favorites: tabFavorites, level: tabLevel, coupons: tabCoupons, profile: tabProfile, prefs: tabPrefs, security: tabSecurity }[id];
    panel.innerHTML = '<div class="acp-skeleton"><span></span><span></span></div>';
    Promise.resolve(fn(panel)).catch(function () {
      panel.innerHTML = '<div class="acp-card"><p class="acp-muted">Não foi possível carregar agora. Tente de novo em instantes.</p></div>';
    });
  }

  function card(title, inner, extra, cls) {
    return '<section class="acp-card' + (cls ? " " + cls : "") + '"><div class="acp-card-head"><h3>' + esc(title) + "</h3>" + (extra || "") + "</div>" + inner + "</section>";
  }
  function emptyHtml(icon, title, text, ctaHtml) {
    return '<div class="acp-empty"><span class="acp-empty-icon">' + ico(icon) + "</span><h4>" + esc(title) + "</h4><p>" + esc(text) + "</p>" + (ctaHtml || "") + "</div>";
  }
  function statusChip(s) {
    var st = STATUS[s] || { label: s, tone: "grey" };
    return '<span class="acp-status acp-status--' + st.tone + '">' + esc(st.label) + "</span>";
  }
  function itemsCount(o) {
    var c = o.order_items && o.order_items[0] && o.order_items[0].count;
    return typeof c === "number" ? c : 0;
  }

  /* ---------------- abas ---------------- */
  function tabOverview(panel) {
    var orders = data.orders || [];
    var favs = window.SG.wishlist ? window.SG.wishlist.count() : 0;
    var coupons = (data.redemptions || []).filter(function (r) { return r.couponCode; }).length;
    var xp = data.xp;
    var last = orders[0];
    var stats = [
      { tab: "orders", icon: "orders", n: orders.length, label: "Pedidos" },
      { tab: "favorites", icon: "favorites", n: favs, label: "Favoritos" },
      { tab: "level", icon: "level", n: xp ? xp.totalXp : 0, label: "XP total" },
      { tab: "coupons", icon: "coupons", n: coupons, label: "Cupons" }
    ];
    panel.innerHTML =
      '<div class="acp-stats">' + stats.map(function (s, i) {
        return '<button class="acp-stat" type="button" data-acp-tab="' + s.tab + '" style="--i:' + i + '">' + ico(s.icon) + "<b>" + s.n + "</b><span>" + esc(s.label) + "</span></button>";
      }).join("") + "</div>" +
      '<div class="acp-grid">' +
        card("Último pedido", last
          ? '<div class="acp-last">' +
              '<div class="acp-order-top"><b>#' + esc(String(last.id).slice(0, 8).toUpperCase()) + "</b>" + statusChip(last.status) + "</div>" +
              '<p class="acp-muted">' + esc(fmtDate(last.created_at)) + " · " + itemsCount(last) + " " + (itemsCount(last) === 1 ? "item" : "itens") + "</p>" +
              '<p class="acp-big">' + (last.total_cents ? esc(money(last.total_cents)) : "A confirmar") + "</p>" +
              '<a class="acp-link" href="/pedido/' + encodeURIComponent(last.id) + '">Ver detalhes ' + ico("arrow") + "</a>" +
            "</div>"
          : emptyHtml("orders", "Nenhum pedido ainda", "Quando você fechar um pedido, ele aparece aqui com status e rastreio.", '<a class="acp-btn acp-btn--primary" href="/#colecao" data-acp-go="/#colecao">Explorar coleção</a>')) +
        card("Seu nível", xp
          ? '<div class="acp-level-mini"><p class="acp-big">' + esc(xp.level.name) + "</p>" +
              '<div class="acp-bar"><span style="width:' + Math.max(3, xp.progressPct) + '%"></span></div>' +
              '<p class="acp-muted">' + esc(xp.nextLevel ? xp.xpToNext + " XP para " + xp.nextLevel.name : "Nível máximo alcançado") + "</p>" +
              '<button class="acp-link" type="button" data-acp-tab="level">Ver níveis e ranking ' + ico("arrow") + "</button></div>"
          : emptyHtml("level", "Seu XP começa no primeiro pedido", "1 XP por R$ 1 em pedido pago, mais bônus da comunidade.")) +
      "</div>" +
      '<div class="acp-actions">' +
        '<a class="acp-action" href="/#colecao" data-acp-go="/#colecao">' + ico("bag") + "<span><b>Ver coleção</b><small>Lupas, relógios, perfumes e mais</small></span></a>" +
        '<a class="acp-action" href="/comunidade">' + ico("favorites") + "<span><b>Postar meu visual</b><small>+30 XP por foto aprovada</small></span></a>" +
        '<a class="acp-action" href="' + esc(window.SG.waLink("Olá! Preciso de ajuda com minha conta na Street Goose 034.")) + '" target="_blank" rel="noopener">' + ico("chat") + "<span><b>Falar com a gente</b><small>Atendimento pelo WhatsApp</small></span></a>" +
      "</div>";
  }

  function tabOrders(panel) {
    var orders = data.orders || [];
    if (!orders.length) {
      panel.innerHTML = card("Pedidos", emptyHtml("orders", "Nenhum pedido ainda", "Seus pedidos aparecem aqui com status, valores e código de rastreio.", '<a class="acp-btn acp-btn--primary" href="/#colecao" data-acp-go="/#colecao">Explorar coleção</a>'));
      return;
    }
    var groups = { all: orders, open: orders.filter(function (o) { return o.status === "pending_payment" || o.status === "paid"; }), done: orders.filter(function (o) { return o.status === "fulfilled"; }), closed: orders.filter(function (o) { return o.status === "cancelled" || o.status === "refunded"; }) };
    var labels = { all: "Todos", open: "Em andamento", done: "Enviados", closed: "Cancelados" };
    var list = groups[orderFilter] || orders;
    panel.innerHTML =
      '<div class="acp-filters">' + Object.keys(labels).map(function (k) {
        return '<button class="acp-filter' + (orderFilter === k ? " is-active" : "") + '" type="button" data-acp-order-filter="' + k + '">' + esc(labels[k]) + "<b>" + groups[k].length + "</b></button>";
      }).join("") + "</div>" +
      (list.length
        ? '<div class="acp-orders">' + list.map(function (o, i) {
            var n = itemsCount(o);
            return (
              '<article class="acp-order" style="--i:' + Math.min(i, 10) + '">' +
                '<div class="acp-order-top"><b>#' + esc(String(o.id).slice(0, 8).toUpperCase()) + "</b>" + statusChip(o.status) + "</div>" +
                '<p class="acp-muted">' + esc(fmtDate(o.created_at)) + " · " + n + " " + (n === 1 ? "item" : "itens") + (o.payment_method ? " · " + esc(o.payment_method === "whatsapp" ? "WhatsApp" : o.payment_method) : "") + "</p>" +
                '<dl class="acp-order-sums">' +
                  (o.discount_cents ? "<div><dt>Desconto" + (o.coupon_code ? " (" + esc(o.coupon_code) + ")" : "") + "</dt><dd>− " + esc(money(o.discount_cents)) + "</dd></div>" : "") +
                  (o.shipping_cents ? "<div><dt>Frete</dt><dd>" + esc(money(o.shipping_cents)) + "</dd></div>" : "") +
                  '<div class="is-total"><dt>Total</dt><dd>' + (o.total_cents ? esc(money(o.total_cents)) : "A confirmar no atendimento") + "</dd></div>" +
                "</dl>" +
                (o.tracking_code ? '<button class="acp-track" type="button" data-acp-copy="' + esc(o.tracking_code) + '" data-acp-copy-msg="RASTREIO COPIADO">' + ico("copy") + "Rastreio <b>" + esc(o.tracking_code) + "</b></button>" : "") +
                '<a class="acp-link" href="/pedido/' + encodeURIComponent(o.id) + '">Ver detalhes ' + ico("arrow") + "</a>" +
              "</article>"
            );
          }).join("") + "</div>"
        : card("Pedidos", '<p class="acp-muted">Nenhum pedido neste filtro.</p>'));
  }

  function tabFavorites(panel) {
    var items = window.SG.wishlist ? window.SG.wishlist.getItems() : [];
    if (!items.length) {
      panel.innerHTML = card("Favoritos", emptyHtml("favorites", "Nada salvo ainda", "Toque no coração das peças pra guardar aqui e decidir depois.", '<a class="acp-btn acp-btn--primary" href="/#colecao" data-acp-go="/#colecao">Explorar coleção</a>'));
      return;
    }
    panel.innerHTML = '<div class="acp-favs">' + items.map(function (p, i) {
      var action = p.soldOut
        ? '<span class="acp-sold">Esgotado</span>'
        : p.consultWhatsApp
          ? '<a class="acp-fav-act acp-fav-act--ghost" href="' + esc(window.SG.waProductLink(p)) + '" target="_blank" rel="noopener" aria-label="Consultar no WhatsApp">' + ico("chat") + "</a>"
          : '<button class="acp-fav-act" type="button" data-add-to-cart="' + esc(p.id) + '" aria-label="Adicionar à sacola">' + ico("bag") + "</button>";
      return (
        '<article class="acp-fav" style="--i:' + Math.min(i, 12) + '">' +
          '<a class="acp-fav-media" href="#" data-open-quickview="' + esc(p.id) + '"><img src="' + esc(p.images[0]) + '" alt="' + esc(p.alt || p.name) + '" loading="lazy" decoding="async"></a>' +
          '<button class="acp-fav-remove" type="button" data-favorite-toggle="' + esc(p.id) + '" aria-pressed="true" aria-label="Remover dos favoritos">' + ico("favorites") + "</button>" +
          '<p class="acp-fav-name">' + esc(p.name) + "</p>" +
          '<div class="acp-fav-foot"><span>' + esc(p.priceLabel || "") + "</span>" + action + "</div>" +
        "</article>"
      );
    }).join("") + "</div>";
  }

  async function tabLevel(panel) {
    var loads = await Promise.all([
      data.levels || svc.rewards.getLevels(),
      svc.rewards.getMyRanking(),
      svc.rewards.getMyXpHistory(30),
      svc.profile.getMine()
    ]);
    if (destroyed) return;
    data.levels = loads[0]; data.ranking = loads[1]; data.history = loads[2]; data.profile = loads[3] || data.profile;
    var xp = data.xp;
    var total = xp ? xp.totalXp : 0;
    var current = xp ? xp.level.levelNumber : 1;
    panel.innerHTML =
      '<div class="acp-grid">' +
        card("Escada de níveis", '<ol class="acp-ladder">' + (data.levels || []).map(function (l) {
          var reached = total >= l.xpRequired;
          var isCur = l.levelNumber === current;
          return '<li class="' + (isCur ? "is-current" : reached ? "is-reached" : "") + '"><span class="acp-ladder-dot">' + (reached ? ico("check") : l.levelNumber) + "</span>" +
            "<span><b>" + esc(l.name) + "</b><small>" + l.xpRequired + " XP</small></span>" + (isCur ? '<em>Você está aqui</em>' : "") + "</li>";
        }).join("") + "</ol>", "", "acp-card--tall") +
        '<div class="acp-stack">' +
          '<section class="acp-card" data-ranking-card></section>' +
          card("Como ganhar XP", '<ul class="acp-rules">' +
            "<li><b>1 XP por R$ 1</b> em pedido pago (mínimo 50 XP por pedido)</li>" +
            "<li><b>+30 XP</b> por foto aprovada na comunidade</li>" +
            "<li>Bônus da equipe em eventos e campanhas</li>" +
            "<li>Pedido cancelado ou reembolsado devolve o XP dele</li>" +
          "</ul>") +
        "</div>" +
      "</div>" +
      card("Histórico de XP", (data.history || []).length
        ? '<ul class="acp-history">' + data.history.map(function (e) {
            return "<li><span>" + esc(xpLabel(e)) + "<small>" + esc(fmtDate(e.createdAt)) + '</small></span><b class="' + (e.amount < 0 ? "is-minus" : "is-plus") + '">' + (e.amount > 0 ? "+" : "") + e.amount + " XP</b></li>";
          }).join("") + "</ul>"
        : '<p class="acp-muted">Seu primeiro XP chega com o primeiro pedido pago.</p>');
    renderRanking(panel);
  }

  function xpLabel(e) {
    if (e.reason === "admin_adjustment") return e.refType === "order" ? "Ajuste de pedido" + (e.note ? " — " + e.note : "") : (e.note || "Bônus da equipe");
    return XP_REASONS[e.reason] || e.reason;
  }

  function renderRanking(scope) {
    var box = (scope || bodyEl).querySelector("[data-ranking-card]");
    if (!box) return;
    var me = data.ranking, profile = data.profile;
    var opted = !!(profile && profile.rankingOptIn);
    var handle = (profile && profile.publicHandle) || "";
    box.innerHTML =
      '<div class="acp-card-head"><h3>Ranking</h3><a class="acp-link" href="/ranking">Ver ranking ' + ico("arrow") + "</a></div>" +
      (me && me.optedIn && me.position ? '<p class="acp-rank-pos">Você está em <b>Nº ' + me.position + "</b> de " + me.participants + " · " + me.totalXp + " XP</p>" : "") +
      '<form class="acp-form" data-ranking-form novalidate>' +
        '<label class="acp-switch"><input type="checkbox" name="opt_in"' + (opted ? " checked" : "") + '><span class="acp-switch-ui" aria-hidden="true"></span>Aparecer no ranking público</label>' +
        '<label class="acp-field"><span>Apelido no ranking</span><input name="handle" value="' + esc(handle) + '" maxlength="24" autocomplete="off" placeholder="ex.: goose.rider"></label>' +
        '<small class="acp-help">3 a 24 caracteres: letras, números, ponto ou _. Sem apelido, aparece só o seu primeiro nome.</small>' +
        '<p class="acp-form-msg" data-ranking-msg role="status"></p>' +
        '<button class="acp-btn acp-btn--primary" type="submit">Salvar</button>' +
      "</form>";
  }

  async function tabCoupons(panel) {
    var loads = await Promise.all([svc.rewards.getMyRedemptions(), data.rewards || svc.rewards.getRewards()]);
    if (destroyed) return;
    data.redemptions = loads[0]; data.rewards = loads[1];
    var mine = data.redemptions.filter(function (r) { return r.couponCode; });
    var redeemed = {};
    data.redemptions.forEach(function (r) { redeemed[r.rewardId] = true; });
    var level = data.xp ? data.xp.level.levelNumber : 1;
    panel.innerHTML =
      card("Meus cupons", mine.length
        ? '<div class="acp-coupons">' + mine.map(function (r) {
            return '<div class="acp-coupon"><span class="acp-coupon-code">' + esc(r.couponCode) + "</span><span class=\"acp-coupon-meta\"><b>" + esc(r.title) + "</b><small>Resgatado em " + esc(fmtDate(r.redeemedAt)) + "</small></span>" +
              '<button class="acp-btn acp-btn--ghost" type="button" data-acp-copy="' + esc(r.couponCode) + '" data-acp-copy-msg="CUPOM COPIADO">' + ico("copy") + "Copiar</button></div>";
          }).join("") + '</div><p class="acp-muted">Use no checkout, no campo Cupom.</p>'
        : '<p class="acp-muted">Nenhum cupom ainda. Resgate uma recompensa abaixo quando seu nível liberar.</p>') +
      card("Recompensas", (data.rewards || []).length
        ? '<div class="acp-rewards">' + data.rewards.map(function (r) {
            var locked = r.requirementLevel && level < r.requirementLevel;
            var done = redeemed[r.id];
            return '<article class="acp-reward' + (locked ? " is-locked" : "") + '">' +
              '<p class="acp-reward-kind">' + esc(String(r.kind || "").toUpperCase()) + (r.discountPercent ? " · " + r.discountPercent + "% OFF" : "") + "</p>" +
              "<h4>" + esc(r.title) + "</h4><p>" + esc(r.description) + "</p>" +
              (r.requirementLevel ? '<p class="acp-reward-req">' + ico("lock") + "Nível " + r.requirementLevel + "+</p>" : "") +
              (done ? '<span class="acp-btn acp-btn--done">' + ico("check") + "Resgatado</span>"
                : '<button class="acp-btn ' + (locked ? "acp-btn--ghost" : "acp-btn--primary") + '" type="button" data-acp-redeem="' + esc(r.id) + '"' + (locked ? " disabled" : "") + ">" + (locked ? "Bloqueado" : "Resgatar") + "</button>") +
            "</article>";
          }).join("") + "</div>"
        : '<p class="acp-muted">Nenhuma recompensa ativa no momento.</p>');
  }

  function tabProfile(panel) {
    var id = identity();
    var current = (data.profile && data.profile.displayName) || (session.user.user_metadata || {}).name || "";
    panel.innerHTML =
      '<div class="acp-grid">' +
        card("Dados pessoais",
          '<form class="acp-form" data-profile-form novalidate>' +
            '<label class="acp-field"><span>Nome de exibição</span><input name="display_name" value="' + esc(current) + '" maxlength="80" autocomplete="name" required></label>' +
            '<label class="acp-field"><span>E-mail</span><input value="' + esc(id.email) + '" readonly aria-readonly="true"></label>' +
            '<small class="acp-help">O e-mail é o da sua forma de login e não muda por aqui.</small>' +
            '<p class="acp-form-msg" data-profile-msg role="status"></p>' +
            '<button class="acp-btn acp-btn--primary" type="submit">Salvar alterações</button>' +
          "</form>") +
        card("Sua conta",
          '<dl class="acp-facts">' +
            "<div><dt>Login</dt><dd>" + esc(providerLabel(id.provider)) + "</dd></div>" +
            "<div><dt>Membro desde</dt><dd>" + esc(fmtDate(id.since)) + "</dd></div>" +
            "<div><dt>Nível</dt><dd>" + esc(data.xp ? data.xp.level.levelNumber + " · " + data.xp.level.name : "—") + "</dd></div>" +
            "<div><dt>Apelido no ranking</dt><dd>" + esc((data.profile && data.profile.publicHandle) || "—") + ' <button class="acp-link" type="button" data-acp-tab="level">Editar</button></dd></div>' +
          "</dl>") +
      "</div>";
  }

  async function tabPrefs(panel) {
    var prefs = await svc.notif.getMine();
    if (destroyed) return;
    data.notif = prefs;
    panel.innerHTML =
      '<div class="acp-grid">' +
        card("Tema e idioma", '<div class="acp-prefs" data-acp-prefs>' + (window.SG.prefsPanel ? window.SG.prefsPanel.html() : "") + "</div>") +
        card("Notificações",
          '<div class="acp-toggles">' + NOTIF.map(function (n) {
            return '<label class="acp-toggle"><span><b>' + esc(n.label) + "</b><small>" + esc(n.hint) + '</small></span><input type="checkbox" data-acp-notif="' + n.key + '"' + (prefs[n.key] ? " checked" : "") + '><span class="acp-switch-ui" aria-hidden="true"></span></label>';
          }).join("") + "</div>" +
          (svc.notif.emailProviderConfigured() ? "" : '<p class="acp-muted acp-note">Suas escolhas ficam salvas. O envio por e-mail começa quando ativarmos os avisos automáticos.</p>')) +
      "</div>";
  }

  function tabSecurity(panel) {
    var id = identity();
    var isEmail = id.provider === "email";
    panel.innerHTML =
      '<div class="acp-grid">' +
        card("Senha", isEmail
          ? '<form class="acp-form" data-password-form novalidate>' +
              '<label class="acp-field"><span>Nova senha</span><input type="password" name="password" minlength="8" autocomplete="new-password" required></label>' +
              '<label class="acp-field"><span>Confirmar nova senha</span><input type="password" name="confirm" minlength="8" autocomplete="new-password" required></label>' +
              '<small class="acp-help">Mínimo de 8 caracteres.</small>' +
              '<p class="acp-form-msg" data-password-msg role="status"></p>' +
              '<button class="acp-btn acp-btn--primary" type="submit">' + ico("lock") + "Atualizar senha</button>" +
            "</form>"
          : '<p class="acp-muted">Você entra com ' + esc(providerLabel(id.provider)) + ": a senha é cuidada pela sua conta " + esc(providerLabel(id.provider)) + ". Ative a verificação em duas etapas por lá pra mais segurança.</p>") +
        card("Sessões",
          '<p class="acp-muted">Saiu de um aparelho emprestado ou perdeu o celular? Encerre o acesso em todos de uma vez.</p>' +
          '<div class="acp-row">' +
            '<button class="acp-btn acp-btn--ghost" type="button" data-acp-signout="local">' + ico("out") + "Sair deste aparelho</button>" +
            '<button class="acp-btn acp-btn--danger" type="button" data-acp-signout="global">' + ico("out") + "Sair de todos os aparelhos</button>" +
          "</div>") +
        card("Seus dados (LGPD)",
          '<p class="acp-muted">Baixe uma cópia do que guardamos sobre você: perfil, pedidos, XP, cupons e preferências.</p>' +
          '<div class="acp-row">' +
            '<button class="acp-btn acp-btn--ghost" type="button" data-acp-export>' + ico("download") + "Baixar meus dados</button>" +
            '<a class="acp-btn acp-btn--ghost" href="' + esc(window.SG.waLink("Olá! Quero solicitar a exclusão da minha conta Street Goose 034 (" + id.email + ").")) + '" target="_blank" rel="noopener">' + ico("chat") + "Pedir exclusão da conta</a>" +
          "</div>", "", "acp-card--wide") +
      "</div>";
  }

  /* ---------------- ações ---------------- */
  bodyEl.addEventListener("click", async function (e) {
    var tabBtn = e.target.closest("[data-acp-tab]");
    if (tabBtn) { e.preventDefault(); showTab(tabBtn.getAttribute("data-acp-tab")); var p = bodyEl.querySelector("[data-acp-panel]"); if (p && tabBtn.classList.contains("acp-tab") === false) p.scrollIntoView({ block: "start", behavior: "smooth" }); return; }
    if (e.target.closest("[data-acp-login]")) { if (window.SG.auth) window.SG.auth.open(); return; }
    var go = e.target.closest("[data-acp-go]");
    if (go) { e.preventDefault(); e.stopPropagation(); onClose(); setTimeout(function () { var el = document.querySelector(go.getAttribute("data-acp-go").replace("/", "")); if (el) el.scrollIntoView({ behavior: "smooth" }); }, 80); return; }
    var filter = e.target.closest("[data-acp-order-filter]");
    if (filter) { orderFilter = filter.getAttribute("data-acp-order-filter"); tabOrders(bodyEl.querySelector("[data-acp-panel]")); return; }
    var cp = e.target.closest("[data-acp-copy]");
    if (cp) { copy(cp.getAttribute("data-acp-copy"), cp.getAttribute("data-acp-copy-msg")); return; }
    if (e.target.closest("[data-favorite-toggle]") && activeTab === "favorites") {
      // a remoção passa pela checagem de login (async) antes de mudar a lista
      setTimeout(function () { if (!destroyed && activeTab === "favorites") tabFavorites(bodyEl.querySelector("[data-acp-panel]")); }, 350);
      return;
    }
    var redeem = e.target.closest("[data-acp-redeem]");
    if (redeem && !redeem.disabled) {
      redeem.disabled = true;
      var res = await svc.rewards.redeem(redeem.getAttribute("data-acp-redeem"));
      if (destroyed) return;
      var msgs = { level_too_low: "SEU NÍVEL AINDA NÃO LIBERA ESSA RECOMPENSA", already_redeemed: "VOCÊ JÁ RESGATOU ESSA RECOMPENSA", rate_limited: "MUITAS TENTATIVAS — TENTE EM INSTANTES" };
      if (res.ok) { toast(res.couponCode ? "CUPOM " + res.couponCode + " LIBERADO" : "RECOMPENSA RESGATADA"); data.rewards = null; tabCoupons(bodyEl.querySelector("[data-acp-panel]")); }
      else { redeem.disabled = false; toast(msgs[res.reason] || "NÃO FOI POSSÍVEL RESGATAR AGORA"); }
      return;
    }
    var so = e.target.closest("[data-acp-signout]");
    if (so) {
      var scope = so.getAttribute("data-acp-signout");
      if (scope === "global" && !so.classList.contains("is-confirm")) {
        so.classList.add("is-confirm");
        so.lastChild.textContent = "Toque de novo pra confirmar";
        setTimeout(function () { if (so.isConnected) { so.classList.remove("is-confirm"); so.lastChild.textContent = "Sair de todos os aparelhos"; } }, 4000);
        return;
      }
      so.disabled = true;
      try {
        if (scope === "global" && supa) await supa.auth.signOut({ scope: "global" });
        else await svc.auth.signOut();
      } catch (err) {}
      toast(scope === "global" ? "SESSÃO ENCERRADA EM TODOS OS APARELHOS" : "SESSÃO ENCERRADA");
      onClose();
      return;
    }
    if (e.target.closest("[data-acp-export]")) { exportData(); return; }
  });

  bodyEl.addEventListener("change", async function (e) {
    var n = e.target.closest("[data-acp-notif]");
    if (!n) return;
    var patch = {};
    patch[n.getAttribute("data-acp-notif")] = n.checked;
    n.disabled = true;
    var ok = await svc.notif.updateMine(patch);
    if (destroyed) return;
    n.disabled = false;
    if (!ok) { n.checked = !n.checked; toast("NÃO FOI POSSÍVEL SALVAR"); }
    else toast("PREFERÊNCIA SALVA");
  });

  bodyEl.addEventListener("submit", async function (e) {
    var rank = e.target.closest("[data-ranking-form]");
    var prof = e.target.closest("[data-profile-form]");
    var pass = e.target.closest("[data-password-form]");
    if (!rank && !prof && !pass) return;
    e.preventDefault();
    var form = e.target;
    var btn = form.querySelector('button[type="submit"]');

    if (rank) {
      var msg = form.querySelector("[data-ranking-msg]");
      var handle = form.querySelector('[name="handle"]').value.trim();
      if (handle && !HANDLE_RE.test(handle)) { msg.textContent = "Apelido com 3 a 24 caracteres: letras, números, ponto ou _."; return; }
      btn.disabled = true;
      // set_my_ranking (0104): apelido único sem diferenciar maiúsculas, erro como dado
      var res = await svc.rewards.setMyRanking(form.querySelector('[name="opt_in"]').checked, handle || null);
      if (destroyed) return;
      btn.disabled = false;
      if (!res.ok) {
        msg.textContent = res.reason === "handle_taken" ? "Esse apelido já está em uso. Tente outro."
          : res.reason === "invalid_handle" ? "Apelido com 3 a 24 caracteres: letras, números, ponto ou _."
          : "Não foi possível salvar agora.";
        return;
      }
      toast("RANKING ATUALIZADO");
      var fresh = await Promise.all([svc.rewards.getMyRanking(), svc.profile.getMine()]);
      if (destroyed) return;
      data.ranking = fresh[0]; data.profile = fresh[1] || data.profile;
      renderRanking();
      return;
    }

    if (prof) {
      var pmsg = form.querySelector("[data-profile-msg]");
      var name = form.querySelector('[name="display_name"]').value.trim();
      if (name.length < 2 || name.length > 80 || /[<>]/.test(name)) { pmsg.textContent = "Use de 2 a 80 caracteres, sem < ou >."; return; }
      btn.disabled = true;
      var ok = await svc.profile.updatePreferences({ displayName: name });
      // espelha no login pra o header e o menu mostrarem o nome novo
      try { if (ok && supa) await supa.auth.updateUser({ data: { name: name } }); } catch (err) {}
      if (destroyed) return;
      btn.disabled = false;
      if (!ok) { pmsg.textContent = "Não foi possível salvar agora."; return; }
      if (data.profile) data.profile.displayName = name;
      try { session = (await svc.auth.getSession()) || session; } catch (err) {}
      pmsg.textContent = "";
      toast("PERFIL ATUALIZADO");
      var nameEl = bodyEl.querySelector(".acp-name");
      if (nameEl) nameEl.textContent = name;
      return;
    }

    if (pass) {
      var smsg = form.querySelector("[data-password-msg]");
      var pw = form.querySelector('[name="password"]').value;
      var cf = form.querySelector('[name="confirm"]').value;
      if (pw.length < 8) { smsg.textContent = "A senha precisa de pelo menos 8 caracteres."; return; }
      if (pw !== cf) { smsg.textContent = "As senhas não conferem."; return; }
      btn.disabled = true;
      var r = supa ? await supa.auth.updateUser({ password: pw }) : { error: { message: "indisponível" } };
      if (destroyed) return;
      btn.disabled = false;
      if (r.error) {
        smsg.textContent = /reauth|recent/i.test(r.error.message || "") ? "Por segurança, saia e entre de novo antes de trocar a senha."
          : /different|same/i.test(r.error.message || "") ? "A nova senha precisa ser diferente da atual."
          : "Não foi possível atualizar a senha agora.";
        return;
      }
      form.reset();
      smsg.textContent = "";
      toast("SENHA ATUALIZADA");
    }
  });

  async function exportData() {
    var btn = bodyEl.querySelector("[data-acp-export]");
    if (btn) btn.disabled = true;
    try {
      var items = supa ? await supa.from("order_items").select("order_id, product_id, product_name, unit_price_cents, qty") : { data: [] };
      var payload = {
        exportado_em: new Date().toISOString(),
        conta: { email: session.user.email, criada_em: session.user.created_at, login: identity().provider },
        perfil: data.profile,
        pedidos: (data.orders || []).map(function (o) {
          return Object.assign({}, o, { itens: (items.data || []).filter(function (it) { return it.order_id === o.id; }) });
        }),
        xp: { status: data.xp, historico: await svc.rewards.getMyXpHistory(500) },
        cupons_e_recompensas: await svc.rewards.getMyRedemptions(),
        notificacoes: await svc.notif.getMine(),
        favoritos: window.SG.wishlist ? window.SG.wishlist.getItems().map(function (p) { return { id: p.id, nome: p.name }; }) : []
      };
      var blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
      var url = URL.createObjectURL(blob);
      var a = document.createElement("a");
      a.href = url;
      a.download = "street-goose-034-meus-dados.json";
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(function () { URL.revokeObjectURL(url); }, 2000);
      toast("SEUS DADOS FORAM BAIXADOS");
    } catch (err) {
      toast("NÃO FOI POSSÍVEL GERAR O ARQUIVO");
    }
    if (btn) btn.disabled = false;
  }

  // tema/idioma mudou dentro da aba Preferências: redesenha os cartões
  function onPrefs() {
    var box = bodyEl.querySelector("[data-acp-prefs]");
    if (box && window.SG.prefsPanel) box.innerHTML = window.SG.prefsPanel.html();
  }
  document.addEventListener("sg:prefs-change", onPrefs);

  root.querySelector("[data-app-close]").addEventListener("click", onClose);
  function onKeydown(e) { if (e.key === "Escape" && !document.querySelector(".quickview.is-open")) onClose(); }
  document.addEventListener("keydown", onKeydown, true);

  init();

  return function destroy() {
    destroyed = true;
    root.classList.remove("is-account");
    document.removeEventListener("keydown", onKeydown, true);
    document.removeEventListener("sg:prefs-change", onPrefs);
  };
}
