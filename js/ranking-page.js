/* Street Goose 034 — /ranking. Sem participantes reais (opt-in), mostra
   estado vazio premium em vez de inventar usuários. */
import { escapeHtml } from "../src/lib/html.ts";

export function mountRankingPage(root, _params, onClose) {
  function t(key) { return (window.SG.i18n && window.SG.i18n.t(key)) || key; }

  root.innerHTML =
    '<div class="app-page-head"><h1>' + t("ranking.title") + '</h1>' +
    '<button class="app-page-close" type="button" data-app-close aria-label="' + t("common.close") + '"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg></button></div>' +
    '<div class="app-page-body" data-ranking-body><div class="app-page-loading">' + t("common.loading") + "</div></div>";

  var bodyEl = root.querySelector("[data-ranking-body]");

  async function render() {
    var mod = await import("../src/services/RewardsService.ts");
    var svc = mod.RewardsService;
    if (!svc.isConfigured()) {
      bodyEl.innerHTML = '<div class="app-page-empty"><h2>' + t("ranking.empty") + "</h2></div>";
      return;
    }
    var rows = await svc.getRanking(7);
    if (!rows.length) {
      bodyEl.innerHTML = '<div class="app-page-empty"><h2>' + t("ranking.empty") + "</h2></div>";
      return;
    }
    bodyEl.innerHTML = '<ol class="ranking-list">' + rows.map(function (r, i) {
      return '<li class="ranking-row ranking-row--' + (i + 1) + '"><span class="ranking-pos">' + (i + 1) + '</span><span class="ranking-handle">' + escapeHtml(r.handle) + '</span><span class="ranking-xp">' + r.totalXp + " XP</span></li>";
    }).join("") + "</ol>";
  }

  root.querySelector("[data-app-close]").addEventListener("click", onClose);
  function onKeydown(e) { if (e.key === "Escape") onClose(); }
  document.addEventListener("keydown", onKeydown);
  render();
  return function destroy() { document.removeEventListener("keydown", onKeydown); };
}
