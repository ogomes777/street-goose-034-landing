/* Street Goose 034 — /conta e /conta/pedidos.
   Sem Supabase configurado, mostra estado "faça login" (que por sua vez
   mostra "login não configurado" — honesto em cascata, nunca dado fake). */
export function mountAccountPage(root, _params, onClose) {
  function t(key) { return (window.SG.i18n && window.SG.i18n.t(key)) || key; }
  var isOrdersView = location.pathname.indexOf("/pedidos") !== -1;

  root.innerHTML =
    '<div class="app-page-head"><h1>' + t(isOrdersView ? "nav.account.orders" : "account.title") + '</h1>' +
    '<button class="app-page-close" type="button" data-app-close aria-label="' + t("common.close") + '"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg></button></div>' +
    '<div class="app-page-body" data-account-body><div class="app-page-loading">' + t("common.loading") + "</div></div>";

  var bodyEl = root.querySelector("[data-account-body]");

  async function render() {
    var authMod = await import("../src/services/AuthService.ts");
    var svc = authMod.AuthService;
    if (!svc.isConfigured()) {
      bodyEl.innerHTML = '<div class="app-page-empty"><h2>' + t("auth.notConfigured") + "</h2>" +
        '<button class="btn btn-primary" data-account-login>' + t("nav.account.signedOut") + "</button></div>";
      bodyEl.querySelector("[data-account-login]").addEventListener("click", function () { if (window.SG.auth) window.SG.auth.open(); });
      return;
    }
    var session = await svc.getSession();
    if (!session) {
      bodyEl.innerHTML = '<div class="app-page-empty"><h2>' + t("nav.account.signedOut") + "</h2>" +
        '<button class="btn btn-primary" data-account-login>' + t("auth.submitSignIn") + "</button></div>";
      bodyEl.querySelector("[data-account-login]").addEventListener("click", function () { if (window.SG.auth) window.SG.auth.open(); });
      return;
    }

    if (isOrdersView) {
      var mod = await import("../src/lib/supabase.ts");
      var client = mod.supabase;
      var orders = [];
      if (client) {
        var res = await client.from("orders").select("*").order("created_at", { ascending: false });
        orders = res.data || [];
      }
      bodyEl.innerHTML = orders.length
        ? '<div class="orders-list">' + orders.map(function (o) {
            return '<a class="order-row" href="/pedido/' + encodeURIComponent(o.id) + '"><span>#' + window.SG.esc(o.id.slice(0, 8)) + "</span><span>" + window.SG.esc(window.SG.orderStatusLabel(o.status)) + "</span><span>" + (o.total_cents ? window.SG.formatPrice(o.total_cents) : t("common.consultAvailability")) + "</span></a>";
          }).join("") + "</div>"
        : '<div class="app-page-empty"><h2>' + t("account.orders.empty") + "</h2></div>";
      return;
    }

    var xpStatus = null;
    try {
      var rewardsMod = await import("../src/services/RewardsService.ts");
      xpStatus = await rewardsMod.RewardsService.getMyXpStatus();
    } catch (e) {}

    bodyEl.innerHTML =
      '<div class="account-summary">' +
        '<p class="account-email">' + window.SG.esc(session.user.email || "") + "</p>" +
        (xpStatus
          ? '<div class="account-level-card"><p>' + t("account.level") + " " + xpStatus.level.levelNumber + " — " + window.SG.esc(xpStatus.level.name) + "</p>" +
            '<div class="xp-bar"><div class="xp-bar-fill" style="width:' + xpStatus.progressPct + '%"></div></div>' +
            (xpStatus.xpToNext !== null ? "<p class=\"account-xp-note\">" + xpStatus.xpToNext + " " + t("account.xpToNext") + "</p>" : "") + "</div>"
          : '<div class="account-level-card"><p>' + t("account.level") + " — " + t("common.consultAvailability") + "</p></div>") +
      "</div>" +
      '<nav class="account-nav">' +
        '<a href="/conta/pedidos">' + t("nav.account.orders") + "</a>" +
        '<a href="/favoritos">' + t("nav.account.favorites") + "</a>" +
        '<a href="/ranking">' + t("nav.account.level") + "</a>" +
        '<a href="/recompensas">' + t("nav.account.rewards") + "</a>" +
      "</nav>" +
      '<div class="account-grid">' +
        '<section class="account-card" data-ranking-card><h3>Ranking</h3><p class="account-muted">' + t("common.loading") + "</p></section>" +
        '<section class="account-card"><h3>Como ganhar XP</h3><ul class="account-rules">' +
          "<li><b>1 XP por R$ 1</b> em pedido pago (mínimo 50 XP por pedido)</li>" +
          "<li><b>+30 XP</b> por foto aprovada na comunidade</li>" +
          "<li>Bônus da equipe em eventos e campanhas</li>" +
          "<li>Pedido cancelado ou reembolsado devolve o XP dele</li>" +
        "</ul></section>" +
        '<section class="account-card" data-xp-history><h3>Histórico de XP</h3><p class="account-muted">' + t("common.loading") + "</p></section>" +
        '<section class="account-card" data-my-coupons><h3>Meus cupons</h3><p class="account-muted">' + t("common.loading") + "</p></section>" +
      "</div>";
    loadExtras();
  }

  // ---- ranking (opt-in + apelido), histórico de XP e cupons resgatados ----
  var XP_REASONS = { order_paid: "Pedido pago", community_post_approved: "Foto aprovada na comunidade", review_approved: "Avaliação aprovada", promo: "Promoção" };
  var HANDLE_RE = /^[A-Za-z0-9_.]{3,24}$/;
  var rewardsSvc = null, profileSvc = null;

  function xpLabel(e) {
    if (e.reason === "admin_adjustment") return e.refType === "order" ? "Ajuste de pedido" + (e.note ? " — " + e.note : "") : (e.note || "Bônus da equipe");
    return XP_REASONS[e.reason] || e.reason;
  }

  async function loadExtras() {
    var mods = await Promise.all([import("../src/services/RewardsService.ts"), import("../src/services/ProfileService.ts")]);
    rewardsSvc = mods[0].RewardsService;
    profileSvc = mods[1].ProfileService;
    var results = await Promise.all([rewardsSvc.getMyRanking(), profileSvc.getMine(), rewardsSvc.getMyXpHistory(10), rewardsSvc.getMyRedemptions()]);
    if (destroyed) return;
    renderRanking(results[0], results[1]);
    var hist = bodyEl.querySelector("[data-xp-history]");
    if (hist) {
      hist.innerHTML = "<h3>Histórico de XP</h3>" + (results[2].length
        ? '<ul class="account-xp-list">' + results[2].map(function (e) {
            return '<li><span>' + window.SG.esc(xpLabel(e)) + "<small>" + new Date(e.createdAt).toLocaleDateString("pt-BR") + "</small></span><b class=\"" + (e.amount < 0 ? "is-minus" : "is-plus") + "\">" + (e.amount > 0 ? "+" : "") + e.amount + " XP</b></li>";
          }).join("") + "</ul>"
        : '<p class="account-muted">Seu primeiro XP chega com o primeiro pedido pago.</p>');
    }
    var coupons = bodyEl.querySelector("[data-my-coupons]");
    if (coupons) {
      var withCode = results[3].filter(function (r) { return r.couponCode; });
      coupons.innerHTML = "<h3>Meus cupons</h3>" + (withCode.length
        ? '<ul class="account-coupons">' + withCode.map(function (r) {
            return "<li><b>" + window.SG.esc(r.couponCode) + "</b><span>" + window.SG.esc(r.title) + '</span><button type="button" class="text-link" data-copy-coupon="' + window.SG.esc(r.couponCode) + '">Copiar</button></li>';
          }).join("") + '</ul><p class="account-muted">Use no checkout, no campo Cupom.</p>'
        : '<p class="account-muted">Nenhum cupom ainda. <a href="/recompensas">Ver recompensas</a></p>');
    }
  }

  function renderRanking(me, profile) {
    var card = bodyEl.querySelector("[data-ranking-card]");
    if (!card) return;
    var opted = !!(profile && profile.rankingOptIn);
    var handle = (profile && profile.publicHandle) || "";
    card.innerHTML = "<h3>Ranking</h3>" +
      (me && me.optedIn && me.position ? '<p class="account-rank-pos">Você está em <b>Nº ' + me.position + "</b> de " + me.participants + " · " + me.totalXp + " XP</p>" : "") +
      '<form class="account-form" data-ranking-form novalidate>' +
        '<label class="account-switch"><input type="checkbox" name="opt_in"' + (opted ? " checked" : "") + "> Aparecer no ranking público</label>" +
        '<label class="account-field">Apelido no ranking<input name="handle" value="' + window.SG.esc(handle) + '" maxlength="24" autocomplete="off" placeholder="ex.: goose.rider"></label>' +
        "<small>3 a 24 caracteres: letras, números, ponto ou _. Sem apelido, aparece só o seu primeiro nome.</small>" +
        '<p class="account-form-msg" data-ranking-msg role="status"></p>' +
        '<button class="btn btn-primary" type="submit">Salvar</button>' +
      "</form>";
  }

  bodyEl.addEventListener("submit", async function (e) {
    var form = e.target.closest("[data-ranking-form]");
    if (!form || !rewardsSvc) return;
    e.preventDefault();
    var msg = form.querySelector("[data-ranking-msg]");
    var handle = form.querySelector('[name="handle"]').value.trim();
    if (handle && !HANDLE_RE.test(handle)) { msg.textContent = "Apelido com 3 a 24 caracteres: letras, números, ponto ou _."; return; }
    var btn = form.querySelector('button[type="submit"]');
    btn.disabled = true;
    // set_my_ranking (0104): apelido único sem diferenciar maiúsculas, erro como dado
    var res = await rewardsSvc.setMyRanking(form.querySelector('[name="opt_in"]').checked, handle || null);
    if (destroyed) return;
    btn.disabled = false;
    if (!res.ok) {
      msg.textContent = res.reason === "handle_taken" ? "Esse apelido já está em uso. Tente outro."
        : res.reason === "invalid_handle" ? "Apelido com 3 a 24 caracteres: letras, números, ponto ou _."
        : "Não foi possível salvar agora.";
      return;
    }
    if (window.SG.toast) window.SG.toast("RANKING ATUALIZADO");
    var results = await Promise.all([rewardsSvc.getMyRanking(), profileSvc.getMine()]);
    if (!destroyed) renderRanking(results[0], results[1]);
  });

  bodyEl.addEventListener("click", async function (e) {
    var copy = e.target.closest("[data-copy-coupon]");
    if (!copy) return;
    try { await navigator.clipboard.writeText(copy.getAttribute("data-copy-coupon")); if (window.SG.toast) window.SG.toast("CUPOM COPIADO"); } catch (err) {}
  });

  var destroyed = false;
  root.querySelector("[data-app-close]").addEventListener("click", onClose);
  function onKeydown(e) { if (e.key === "Escape") onClose(); }
  document.addEventListener("keydown", onKeydown);

  render();

  return function destroy() {
    destroyed = true;
    document.removeEventListener("keydown", onKeydown);
  };
}
