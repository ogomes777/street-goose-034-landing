/* Street Goose 034 — /ranking. Só quem ativou "aparecer no ranking" em
   Minha conta (opt-in); nada inventado. Logado: mostra sua posição ou o
   atalho para entrar no ranking. */
export function mountRankingPage(root, _params, onClose) {
  function t(key) { return (window.SG.i18n && window.SG.i18n.t(key)) || key; }
  var esc = window.SG.esc;

  root.innerHTML =
    '<div class="app-page-head"><h1>' + t("ranking.title") + '</h1>' +
    '<button class="app-page-close" type="button" data-app-close aria-label="' + t("common.close") + '"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg></button></div>' +
    '<div class="app-page-body" data-ranking-body><div class="app-page-loading">' + t("common.loading") + "</div></div>";

  var bodyEl = root.querySelector("[data-ranking-body]");
  var destroyed = false;

  function meHtml(me) {
    if (!me) return '<div class="ranking-me"><p>Entre na sua conta para ver sua posição.</p><button class="btn btn-ghost" type="button" data-ranking-login>Entrar</button></div>';
    if (!me.optedIn) {
      return '<div class="ranking-me"><p>Você tem <b>' + me.totalXp + " XP</b> (nível " + me.level + "), mas ainda não aparece no ranking.</p>" +
        '<a class="btn btn-primary" href="/conta">Entrar no ranking</a></div>';
    }
    return '<div class="ranking-me is-in"><p>' + t("ranking.yourPosition") + ": <b>Nº " + me.position + "</b> de " + me.participants +
      " · " + me.totalXp + " XP · nível " + me.level + (me.handle ? " · @" + esc(me.handle) : "") + "</p></div>";
  }

  async function render() {
    var mod = await import("../src/services/RewardsService.ts");
    var svc = mod.RewardsService;
    if (!svc.isConfigured()) {
      bodyEl.innerHTML = '<div class="app-page-empty"><h2>' + t("ranking.empty") + "</h2></div>";
      return;
    }
    var session = window.SG.auth ? await window.SG.auth.getSession() : null;
    var results = await Promise.all([svc.getRanking(20), session ? svc.getMyRanking() : Promise.resolve(null)]);
    if (destroyed) return;
    var rows = results[0];
    var me = results[1];
    var rules = '<p class="ranking-rules">XP vem de pedido pago (1 XP por R$1, mínimo 50) e de foto aprovada na comunidade (+30). Reembolso devolve o XP.</p>';
    if (!rows.length) {
      bodyEl.innerHTML = '<div class="app-page-empty"><h2>' + t("ranking.empty") + "</h2><p>Seja o primeiro: ative o ranking em Minha conta.</p></div>" + meHtml(me) + rules;
      return;
    }
    bodyEl.innerHTML = meHtml(me) + '<ol class="ranking-list">' + rows.map(function (r, i) {
      return '<li class="ranking-row ranking-row--' + (i + 1) + '"><span class="ranking-pos">' + (i + 1) + '</span><span class="ranking-handle">' + esc(r.handle) + '</span><span class="ranking-level">nível ' + r.level + '</span><span class="ranking-xp">' + r.totalXp + " XP</span></li>";
    }).join("") + "</ol>" + rules;
  }

  bodyEl.addEventListener("click", function (e) {
    if (e.target.closest("[data-ranking-login]") && window.SG.auth) window.SG.auth.open();
  });
  var unsubscribe = null;
  import("../src/services/AuthService.ts").then(function (m) {
    if (destroyed) return;
    var first = true;
    unsubscribe = m.AuthService.onAuthStateChange(function () {
      if (first) { first = false; return; }
      setTimeout(function () { if (!destroyed) render(); }, 0);
    });
  });

  root.querySelector("[data-app-close]").addEventListener("click", onClose);
  function onKeydown(e) { if (e.key === "Escape") onClose(); }
  document.addEventListener("keydown", onKeydown);
  render();
  return function destroy() {
    destroyed = true;
    if (unsubscribe) unsubscribe();
    document.removeEventListener("keydown", onKeydown);
  };
}
