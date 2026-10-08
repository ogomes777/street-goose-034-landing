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
            return '<a class="order-row" href="/pedido/' + o.id + '"><span>#' + o.id.slice(0, 8) + "</span><span>" + o.status + "</span><span>" + (o.total_cents ? window.SG.formatPrice(o.total_cents) : t("common.consultAvailability")) + "</span></a>";
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
        '<p class="account-email">' + (session.user.email || "") + "</p>" +
        (xpStatus
          ? '<div class="account-level-card"><p>' + t("account.level") + " " + xpStatus.level.levelNumber + " — " + xpStatus.level.name + "</p>" +
            '<div class="xp-bar"><div class="xp-bar-fill" style="width:' + xpStatus.progressPct + '%"></div></div>' +
            (xpStatus.xpToNext !== null ? "<p class=\"account-xp-note\">" + xpStatus.xpToNext + " " + t("account.xpToNext") + "</p>" : "") + "</div>"
          : '<div class="account-level-card"><p>' + t("account.level") + " — " + t("common.consultAvailability") + "</p></div>") +
      "</div>" +
      '<nav class="account-nav">' +
        '<a href="/conta/pedidos">' + t("nav.account.orders") + "</a>" +
        '<a href="/favoritos">' + t("nav.account.favorites") + "</a>" +
        '<a href="/ranking">' + t("nav.account.level") + "</a>" +
        '<a href="/recompensas">' + t("nav.account.rewards") + "</a>" +
      "</nav>";
  }

  root.querySelector("[data-app-close]").addEventListener("click", onClose);
  function onKeydown(e) { if (e.key === "Escape") onClose(); }
  document.addEventListener("keydown", onKeydown);

  render();

  return function destroy() {
    document.removeEventListener("keydown", onKeydown);
  };
}
