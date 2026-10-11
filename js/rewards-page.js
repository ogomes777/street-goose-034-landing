/* Street Goose 034 — /recompensas. Lista o que o lojista publicou no painel
   (só recompensas ativas); resgate validado no servidor (nível e uso único),
   nunca aplicado direto pela UI. Logado: mostra seu nível, o que ainda está
   bloqueado e o cupom do que você já resgatou. */
export function mountRewardsPage(root, _params, onClose) {
  function t(key) { return (window.SG.i18n && window.SG.i18n.t(key)) || key; }
  var esc = window.SG.esc;
  root.classList.add("is-rewards");
  var activeTab = "available";
  var renderVersion = 0;
  var focusTab = false;
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
    var version = ++renderVersion;
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
    if (destroyed || version !== renderVersion) return;
    var rewards = results[0];
    var status = results[1];
    var redeemed = {};
    results[2].forEach(function (r) { redeemed[r.rewardId] = r; });
    var levelName = {};
    results[3].forEach(function (l) { levelName[l.levelNumber] = l.name; });

    var levels = results[3];
    var myLevel = status ? status.level.levelNumber : 0;
    var redemptions = results[2];
    var available = rewards.filter(function (r) { return !redeemed[r.id] && (!r.requirementLevel || myLevel >= r.requirementLevel); }).length;
    var pct = status ? Math.max(0, Math.min(100, Number(status.progressPct) || 0)) : 0;
    var hero = '<section class="rw-membership" aria-label="Seu nível e XP"><div class="rw-member-top"><span class="rw-eyebrow">STREET GOOSE / MEMBERS CLUB</span><span class="rw-member-seal" aria-hidden="true">034</span></div>' +
      '<p class="rw-member-caption">' + (status ? 'SEU NÍVEL' : 'SEU ACESSO À STREET GOOSE') + '</p><div class="rw-member-level"><h2>' + (status ? esc(status.level.name) : 'Cada escolha conta.') + '</h2>' +
      (status ? '<span class="rw-level-number">LVL ' + status.level.levelNumber + '</span>' : '') + '</div>' +
      (status ? '<div class="rw-xp-total"><b>' + status.totalXp + '</b><span>XP acumulados</span></div><div class="rw-progress-label"><span>' + (status.nextLevel ? 'Próximo: <b>' + esc(status.nextLevel.name) + '</b>' : 'Você chegou ao nível mais alto') + '</span><b>' + pct + '%</b></div><div class="xp-bar" role="progressbar" aria-label="Evolução de nível" aria-valuemin="0" aria-valuemax="100" aria-valuenow="' + pct + '"><div class="xp-bar-fill" style="width:' + pct + '%"></div></div><p class="rw-progress-note">' + (status.nextLevel ? 'Faltam <b>' + status.xpToNext + ' XP</b> para o próximo nível.' : 'Acompanhe os benefícios disponíveis para você.') + '</p>' : '<p class="rw-progress-note">Entre para acompanhar seu XP, liberar benefícios e guardar seus cupons.</p><button class="btn btn-primary" type="button" data-rewards-login>Entrar na minha conta</button>') +
      '<div class="rw-member-bottom"><span>SG / 034</span><span>ESTILO QUE EVOLUI COM VOCÊ</span></div></section>';
    var metrics = '<div class="rw-metrics"><div><b>' + (session ? available : rewards.length) + '</b><span>' + (session ? 'Liberadas para você' : 'Recompensas no ar') + '</span></div><div><b>' + redemptions.length + '</b><span>Resgates na conta</span></div><a href="/conta"><span>Seu histórico</span><b>Ver XP <span aria-hidden="true">↗</span></b></a></div>';
    var roadmap = levels.length ? '<section class="rw-section"><div class="rw-section-head"><div><p class="rw-eyebrow">SUA EVOLUÇÃO</p><h2>Do primeiro passo ao próximo nível.</h2></div><a class="text-link" href="/ranking">Ver ranking ↗</a></div><ol class="rw-levels">' + levels.map(function (l) {
      var current = status && l.levelNumber === myLevel;
      var done = status && l.xpRequired <= status.totalXp;
      return '<li class="rw-level' + (current ? ' is-current' : '') + (done ? ' is-unlocked' : '') + '"><div class="rw-level-top"><span class="rw-level-index">' + String(l.levelNumber).padStart(2, '0') + '</span><span class="rw-level-state">' + (current ? 'Seu nível' : done ? 'Alcançado' : l.xpRequired + ' XP') + '</span></div><h3>' + esc(l.name) + '</h3><p>' + l.xpRequired + ' XP acumulados</p>' + (l.benefits.length ? '<ul>' + l.benefits.map(function (b) { return '<li>' + esc(b) + '</li>'; }).join('') + '</ul>' : '') + '</li>';
    }).join('') + '</ol></section>' : '';
    var earn = '<section class="rw-earn" aria-label="Como ganhar XP"><div><p class="rw-eyebrow">CADA PASSO SOMA</p><h2>Seu estilo. Sua evolução.</h2></div><a href="/conta/pedidos"><b>01 <span>Pedidos pagos</span></b><strong>R$ 1 = 1 XP</strong><small>XP após a confirmação do pagamento.</small></a><a href="/comunidade"><b>02 <span>Seu visual no mural</span></b><strong>+30 XP</strong><small>Por foto aprovada pela equipe. Poste seu visual ↗</small></a></section>';
    function card(r) {
      var mine = redeemed[r.id];
      var locked = !!r.requirementLevel && myLevel < r.requirementLevel;
      var action;
      if (mine) action = mine.couponCode ? couponHtml(mine.couponCode) : '<p class="reward-coupon">Resgatado ✓ — a equipe entra em contato.</p>';
      else if (session && locked) action = '<button class="btn btn-ghost" type="button" disabled>Nível ' + r.requirementLevel + ' necessário</button>';
      else action = '<button class="btn btn-primary" type="button" data-redeem="' + esc(r.id) + '">' + (session ? t('rewards.redeem') : 'Entrar para resgatar') + '</button>';
      return '<article class="reward-card' + (locked && !mine ? ' is-locked' : '') + (mine ? ' is-redeemed' : '') + '"><div class="rw-reward-top"><p class="reward-kind">' + esc(KIND[r.kind] || r.kind.toUpperCase()) + '</p><span class="rw-reward-state">' + (mine ? 'Resgatado' : locked && session ? 'A desbloquear' : 'Disponível') + '</span></div><div class="rw-reward-art" aria-hidden="true">' + (r.discountPercent ? '<b>' + Number(r.discountPercent) + '<small>%</small></b><span>DE DESCONTO</span>' : '<b>034</b><span>' + esc(KIND[r.kind] || 'BENEFÍCIO') + ' / MEMBERS CLUB</span>') + '</div><h3>' + esc(r.title) + '</h3><p>' + esc(r.description) + '</p><p class="reward-requirement">' + (r.requirementLevel ? 'Nível ' + r.requirementLevel + (levelName[r.requirementLevel] ? ' — ' + esc(levelName[r.requirementLevel]) : '') + '+' : 'Livre para todos') + '</p><div data-reward-action="' + esc(r.id) + '">' + action + '</div></article>';
    }
    var list = activeTab === 'wallet' ? redemptions.map(function (r) {
      return '<article class="reward-card is-redeemed"><div class="rw-reward-top"><p class="reward-kind">MEU RESGATE</p><span class="rw-reward-state">Na sua conta</span></div><h3>' + esc(r.title) + '</h3>' + (r.couponCode ? couponHtml(r.couponCode) : '<p>A equipe entra em contato sobre seu benefício.</p>') + '<p class="reward-requirement">Resgate registrado · ' + esc(new Date(r.redeemedAt).toLocaleDateString('pt-BR')) + '</p></article>';
    }).join('') : rewards.map(card).join('');
    var empty = '<div class="rw-empty"><span class="rw-empty-mark" aria-hidden="true">034</span><div><h3>' + (activeTab === 'wallet' ? 'Seus resgates ficam aqui.' : 'O próximo benefício começa aqui.') + '</h3><p>' + (activeTab === 'wallet' ? 'Resgate uma recompensa disponível para guardar seu cupom nesta área.' : 'Ainda não há recompensas publicadas. Continue acumulando XP; os benefícios aparecem quando a equipe liberar.') + '</p><a class="text-link" href="/comunidade">Explorar a comunidade ↗</a></div></div>';
    bodyEl.innerHTML = '<div class="rw-intro"><p class="rw-eyebrow">SG / 034 — RECOMPENSAS</p><h2>Presença tem valor.</h2><p>Acumule XP. Evolua de nível. Aproveite o que a Street Goose preparou para você.</p></div>' + hero + metrics +
      '<section class="rw-section"><div class="rw-section-head"><div><p class="rw-eyebrow">SEUS BENEFÍCIOS</p><h2>Recompensas & cupons</h2></div></div><div class="rw-tabs" role="tablist" aria-label="Recompensas"><button type="button" role="tab" aria-selected="' + (activeTab === 'available') + '" data-reward-tab="available">Recompensas <span>' + rewards.length + '</span></button><button type="button" role="tab" aria-selected="' + (activeTab === 'wallet') + '" data-reward-tab="wallet">Meus resgates <span>' + redemptions.length + '</span></button></div><div role="tabpanel" aria-label="' + (activeTab === 'wallet' ? 'Meus resgates' : 'Recompensas') + '">' + (list ? '<div class="rewards-grid">' + list + '</div>' : empty) + '</div></section>' + roadmap + earn;
    var selectedTab = bodyEl.querySelector('[data-reward-tab="' + activeTab + '"]');
    if (focusTab && selectedTab) selectedTab.focus({ preventScroll: true });
    focusTab = false;

  }

  bodyEl.addEventListener("click", async function (e) {
    var tab = e.target.closest("[data-reward-tab]");
    if (tab) { activeTab = tab.getAttribute("data-reward-tab"); focusTab = true; render(); return; }
    if (e.target.closest("[data-rewards-login]")) { if (window.SG.auth) window.SG.auth.open(); return; }
    var copy = e.target.closest("[data-copy-coupon]");
    if (copy) {
      try { await navigator.clipboard.writeText(copy.getAttribute("data-copy-coupon")); if (window.SG.toast) window.SG.toast("CUPOM COPIADO"); } catch (err) { if (window.SG.toast) window.SG.toast("NÃO FOI POSSÍVEL COPIAR. SELECIONE O CÓDIGO DO CUPOM."); }
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
      if (box) { box.closest(".reward-card").classList.add("is-redeemed"); box.innerHTML = res.couponCode ? couponHtml(res.couponCode) : '<p class="reward-coupon">Resgatado ✓ — a equipe entra em contato.</p>'; }
      render();
      if (window.SG.toast) window.SG.toast("RECOMPENSA RESGATADA");
    } else {
      btn.disabled = false;
      if (window.SG.toast) window.SG.toast((MESSAGES[res.reason] || "Não foi possível resgatar agora.").toUpperCase());
    }
  });

  bodyEl.addEventListener("keydown", function (e) {
    var tab = e.target.closest("[data-reward-tab]");
    if (!tab || ["ArrowLeft", "ArrowRight", "Home", "End"].indexOf(e.key) === -1) return;
    e.preventDefault();
    activeTab = e.key === "Home" ? "available" : e.key === "End" ? "wallet" : activeTab === "available" ? "wallet" : "available";
    focusTab = true;
    render();
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
    root.classList.remove("is-rewards");
    if (unsubscribe) unsubscribe();
    document.removeEventListener("keydown", onKeydown);
  };
}
