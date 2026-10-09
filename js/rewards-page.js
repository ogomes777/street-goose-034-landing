/* Street Goose 034 — /recompensas. Lista o que o lojista publicou no painel
   (só recompensas ativas); resgate validado no servidor (nível e uso único),
   nunca aplicado direto pela UI. Logado: mostra seu nível, o que ainda está
   bloqueado e o cupom do que você já resgatou. */
export function mountRewardsPage(root, _params, onClose) {
  function t(key) { return (window.SG.i18n && window.SG.i18n.t(key)) || key; }
  var esc = window.SG.esc;
  var KIND = { coupon: "CUPOM", gift: "BRINDE", discount: "DESCONTO" };
  var MESSAGES = {
    level_too_low: "Seu nível ainda não libera essa recompensa.",
    already_redeemed: "Você já resgatou essa recompensa.",
    not_found: "Recompensa indisponível.",
    rate_limited: "Muitas tentativas. Tente de novo daqui a pouco.",
  };

  root.innerHTML =
    '<div class="app-page-head"><h1>' + t("rewards.title") + '</h1>' +
    '<button class="app-page-close" type="button" data-app-close aria-label="' + t("common.close") + '"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg></button></div>' +
    '<div class="app-page-body" data-rewards-body><div class="app-page-loading">' + t("common.loading") + "</div></div>";

  var bodyEl = root.querySelector("[data-rewards-body]");
  var svc = null;
  var destroyed = false;

  function couponHtml(code) {
    return '<p class="reward-coupon">Seu cupom: <b>' + esc(code) + '</b> <button type="button" class="text-link" data-copy-coupon="' + esc(code) + '">' + t("rewards.copyCoupon") + "</button></p>" +
      '<p class="reward-requirement">Use no checkout, no campo Cupom.</p>';
  }

  async function render() {
    var mod = await import("../src/services/RewardsService.ts");
    svc = mod.RewardsService;
    if (!svc.isConfigured()) {
      bodyEl.innerHTML = '<div class="app-page-empty"><h2>' + t("auth.notConfigured") + "</h2></div>";
      return;
    }
    var session = window.SG.auth ? await window.SG.auth.getSession() : null;
    var results = await Promise.all([
      svc.getRewards(),
      session ? svc.getMyXpStatus() : Promise.resolve(null),
      session ? svc.getMyRedemptions() : Promise.resolve([]),
      svc.getLevels(),
    ]);
    if (destroyed) return;
    var rewards = results[0];
    var status = results[1];
    var redeemed = {};
    results[2].forEach(function (r) { redeemed[r.rewardId] = r; });
    var levelName = {};
    results[3].forEach(function (l) { levelName[l.levelNumber] = l.name; });

    var head = status
      ? '<div class="rewards-status"><p>Seu nível: <b>' + status.level.levelNumber + " — " + esc(status.level.name) + "</b> · " + status.totalXp + " XP</p>" +
        (status.nextLevel ? '<div class="xp-bar"><div class="xp-bar-fill" style="width:' + status.progressPct + '%"></div></div><small>' + status.xpToNext + " XP para " + esc(status.nextLevel.name) + "</small>" : "") +
        '<small>Ganhe XP com pedidos pagos (1 XP por R$1) e fotos aprovadas na comunidade (+30). <a href="/conta">Ver meu XP</a></small></div>'
      : '<div class="rewards-status"><p>Entre na sua conta para ver seu nível e resgatar.</p><button class="btn btn-primary" type="button" data-rewards-login>Entrar</button></div>';

    if (!rewards.length) {
      bodyEl.innerHTML = head + '<div class="app-page-empty"><h2>Nenhuma recompensa no ar agora.</h2><p>Novas recompensas aparecem aqui assim que a equipe publica.</p></div>';
      return;
    }
    var myLevel = status ? status.level.levelNumber : 0;
    bodyEl.innerHTML = head + '<div class="rewards-grid">' + rewards.map(function (r) {
      var mine = redeemed[r.id];
      var locked = !!r.requirementLevel && myLevel < r.requirementLevel;
      var action;
      if (mine) action = mine.couponCode ? couponHtml(mine.couponCode) : '<p class="reward-coupon">Resgatado ✓ — a equipe entra em contato.</p>';
      else if (session && locked) action = '<button class="btn btn-ghost" type="button" disabled>Nível ' + r.requirementLevel + " necessário</button>";
      else action = '<button class="btn btn-ghost" type="button" data-redeem="' + esc(r.id) + '">' + t("rewards.redeem") + "</button>";
      return (
        '<article class="reward-card' + (locked && !mine ? " is-locked" : "") + (mine ? " is-redeemed" : "") + '">' +
          '<p class="reward-kind">' + esc(KIND[r.kind] || r.kind.toUpperCase()) + "</p>" +
          "<h3>" + esc(r.title) + "</h3><p>" + esc(r.description) + "</p>" +
          (r.requirementLevel ? '<p class="reward-requirement">' + t("account.level") + " " + r.requirementLevel + (levelName[r.requirementLevel] ? " — " + esc(levelName[r.requirementLevel]) : "") + "+</p>" : '<p class="reward-requirement">Livre para todos</p>') +
          '<div data-reward-action="' + esc(r.id) + '">' + action + "</div>" +
        "</article>"
      );
    }).join("") + "</div>";
  }

  bodyEl.addEventListener("click", async function (e) {
    if (e.target.closest("[data-rewards-login]")) { if (window.SG.auth) window.SG.auth.open(); return; }
    var copy = e.target.closest("[data-copy-coupon]");
    if (copy) {
      try { await navigator.clipboard.writeText(copy.getAttribute("data-copy-coupon")); if (window.SG.toast) window.SG.toast("CUPOM COPIADO"); } catch (err) {}
      return;
    }
    var btn = e.target.closest("[data-redeem]");
    if (!btn) return;
    var session = window.SG.auth ? await window.SG.auth.getSession() : null;
    if (!session) { if (window.SG.auth) window.SG.auth.open(); return; }
    btn.disabled = true;
    var id = btn.getAttribute("data-redeem");
    var res = await svc.redeem(id);
    if (destroyed) return;
    var box = bodyEl.querySelector('[data-reward-action="' + id + '"]');
    if (res.ok) {
      if (box) box.innerHTML = res.couponCode ? couponHtml(res.couponCode) : '<p class="reward-coupon">Resgatado ✓ — a equipe entra em contato.</p>';
      if (window.SG.toast) window.SG.toast("RECOMPENSA RESGATADA");
    } else {
      btn.disabled = false;
      if (window.SG.toast) window.SG.toast((MESSAGES[res.reason] || "Não foi possível resgatar agora.").toUpperCase());
    }
  });

  // login pelo modal sem sair da página: recarrega com nível e resgates
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
