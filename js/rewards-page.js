/* Street Goose 034 — /recompensas. Lista config real do backend; resgate
   validado no servidor, nunca aplicado direto pela UI. */
export function mountRewardsPage(root, _params, onClose) {
  function t(key) { return (window.SG.i18n && window.SG.i18n.t(key)) || key; }

  root.innerHTML =
    '<div class="app-page-head"><h1>' + t("rewards.title") + '</h1>' +
    '<button class="app-page-close" type="button" data-app-close aria-label="' + t("common.close") + '"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg></button></div>' +
    '<div class="app-page-body" data-rewards-body><div class="app-page-loading">' + t("common.loading") + "</div></div>";

  var bodyEl = root.querySelector("[data-rewards-body]");

  async function render() {
    var mod = await import("../src/services/RewardsService.ts");
    var svc = mod.RewardsService;
    if (!svc.isConfigured()) {
      bodyEl.innerHTML = '<div class="app-page-empty"><h2>' + t("auth.notConfigured") + "</h2></div>";
      return;
    }
    var rewards = await svc.getRewards();
    if (!rewards.length) {
      bodyEl.innerHTML = '<div class="app-page-empty"><h2>' + t("rewards.title") + " — " + t("common.consultAvailability") + "</h2></div>";
      return;
    }
    bodyEl.innerHTML = '<div class="rewards-grid">' + rewards.map(function (r) {
      return (
        '<article class="reward-card">' +
          '<p class="reward-kind">' + r.kind.toUpperCase() + "</p>" +
          "<h3>" + r.title + "</h3><p>" + r.description + "</p>" +
          (r.requirementLevel ? '<p class="reward-requirement">' + t("account.level") + " " + r.requirementLevel + "+</p>" : "") +
          '<button class="btn btn-ghost" data-redeem="' + r.id + '">' + t("rewards.redeem") + "</button>" +
        "</article>"
      );
    }).join("") + "</div>";

    bodyEl.querySelectorAll("[data-redeem]").forEach(function (btn) {
      btn.addEventListener("click", async function () {
        var session = window.SG.auth ? await window.SG.auth.getSession() : null;
        if (!session) { if (window.SG.auth) window.SG.auth.open(); return; }
        btn.disabled = true;
        var res = await svc.redeem(btn.getAttribute("data-redeem"));
        var msgs = {
          level_too_low: "Seu nível ainda não libera essa recompensa.",
          already_redeemed: "Você já resgatou essa recompensa.",
          not_found: "Recompensa indisponível.",
        };
        if (res.ok) {
          btn.textContent = res.couponCode ? "Cupom: " + res.couponCode : "Resgatado ✓";
        } else {
          btn.disabled = false;
          var msg = msgs[res.reason] || "Não foi possível resgatar agora.";
          if (window.SG.toast) window.SG.toast(msg); else btn.textContent = msg;
        }
      });
    });
  }

  root.querySelector("[data-app-close]").addEventListener("click", onClose);
  function onKeydown(e) { if (e.key === "Escape") onClose(); }
  document.addEventListener("keydown", onKeydown);
  render();
  return function destroy() { document.removeEventListener("keydown", onKeydown); };
}
