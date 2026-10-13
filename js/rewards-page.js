import { gemHtml, levelGem } from './level-gems.js';
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
  var dataCache = null;
  var pending = new Set();
  var copiedCodes = new Set();
  var memberLogo = new URL("../assets/logos/web/logo-street-goose-034.webp", import.meta.url).href;
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
    '<div class="app-page-body" data-rewards-body><div class="rw-loading" role="status" aria-label="Carregando suas recompensas"><div class="app-skeleton rw-skeleton-title"></div><div class="app-skeleton rw-skeleton-card"></div><div class="app-skeleton rw-skeleton-row"></div><span>' + t("common.loading") + '</span></div></div>';

  var bodyEl = root.querySelector("[data-rewards-body]");
  var svc = null;
  var destroyed = false;

  function couponHtml(code) {
    return '<div class="rw-ticket"><span class="rw-ticket-label">SEU CUPOM</span><div class="rw-ticket-code"><b>' + esc(code) + '</b><button type="button" data-copy-coupon="' + esc(code) + '" aria-label="Copiar cupom ' + esc(code) + '"><svg viewBox="0 0 24 24" aria-hidden="true"><rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V4H4v12h4"/></svg><span>' + (copiedCodes.has(code) ? 'Copiado' : t('rewards.copyCoupon')) + '</span></button></div><span class="rw-copy-feedback" role="status" aria-live="polite">' + (copiedCodes.has(code) ? 'Código copiado. Pronto para usar no checkout.' : '') + "</span><p>Use no checkout, no campo Cupom.</p><span class=\"rw-ticket-signature\" aria-hidden=\"true\">MEMBER BENEFIT SG. 034</span></div>";
  }
  function dateLabel(value) {
    var date = new Date(value);
    return Number.isNaN(date.getTime()) ? '' : date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
  }

  async function render(refresh) {
    var version = ++renderVersion;
    var mod = await import("../src/services/RewardsService.ts");
    svc = mod.RewardsService;
    if (!svc.isConfigured()) {
      bodyEl.innerHTML = '<div class="app-page-empty"><h2>' + t("auth.notConfigured") + "</h2></div>";
      return;
    }
    var session, results;
    try {
      if (!refresh && dataCache) { session = dataCache.session; results = dataCache.results; }
      else {
        session = window.SG.auth ? await window.SG.auth.getSession() : null;
        results = await Promise.all([
          svc.getRewards(),
          session ? svc.getMyXpStatus() : Promise.resolve(null),
          session ? svc.getMyRedemptions() : Promise.resolve([]),
          svc.getLevels(),
          session ? svc.getMyXpHistory(6) : Promise.resolve([]),
        ]);
      }
    } catch (err) {
      if (destroyed || version !== renderVersion) return;
      bodyEl.innerHTML = '<div class="rw-load-error" role="alert"><span class="rw-eyebrow">VAMOS TENTAR DE NOVO</span><h2>Não conseguimos carregar suas recompensas.</h2><p>Confira a conexão e tente novamente.</p><button class="btn btn-primary" type="button" data-rewards-retry>Tentar novamente</button></div>';
      return;
    }
    if (destroyed || version !== renderVersion) return;
    dataCache = { session: session, results: results };
    var rewards = results[0];
    var status = results[1];
    var redeemed = {};
    results[2].forEach(function (r) { redeemed[r.rewardId] = r; });
    var levelName = {};
    results[3].forEach(function (l) { levelName[l.levelNumber] = l.name; });

    var levels = results[3].slice().sort(function (a, b) { return a.xpRequired - b.xpRequired; });
    var history = results[4];
    var meta = session && session.user && session.user.user_metadata || {};
    var memberName = String(meta.name || meta.full_name || 'Membro Street Goose');
    var myLevel = status ? status.level.levelNumber : 0;
    var redemptions = results[2];
    var available = rewards.filter(function (r) { return !redeemed[r.id] && (!r.requirementLevel || myLevel >= r.requirementLevel); }).length;
    var pct = status ? Math.max(0, Math.min(100, Number(status.progressPct) || 0)) : 0;
    var hero = '<section class="rw-membership" aria-label="Seu nível e XP"><span class="rw-member-watermark" aria-hidden="true">034</span><div class="rw-member-top"><div class="rw-card-brand"><img src="' + memberLogo + '" alt="Street Goose 034" width="220" height="59"><span>MEMBERS CLUB</span></div><span class="rw-member-seal" aria-hidden="true">034</span></div>' +
      '<div class="rw-member-identity"><span class="rw-member-monogram" aria-hidden="true">' + esc(memberName.charAt(0).toUpperCase()) + "</span><div><span>MEMBERSHIP 034</span><b>" + esc(session ? memberName : 'Seu próximo capítulo') + '</b></div><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m12 2 8 4v6c0 5-8 10-8 10S4 17 4 12V6l8-4Z"/><path d="m8 12 3 3 5-6"/></svg></div>' +
      '<p class="rw-member-caption">' + (status ? 'SEU NÍVEL' : 'SEU ACESSO À STREET GOOSE') + '</p><div class="rw-member-level"><h2>' + (status ? esc(status.level.name) : 'Cada escolha conta.') + '</h2>' +
      (status ? gemHtml(status.level.levelNumber) + '<span class="rw-level-number">LVL ' + status.level.levelNumber + '</span>' : '') + '</div>' +
      (status ? '<div class="rw-xp-total"><b>' + status.totalXp + '</b><span>XP acumulados</span></div><div class="rw-progress-label"><span>' + (status.nextLevel ? 'Próximo: <b>' + esc(status.nextLevel.name) + '</b>' : 'Você chegou ao nível mais alto') + '</span><b>' + pct + '%</b></div><div class="xp-bar" role="progressbar" aria-label="Evolução de nível" aria-valuemin="0" aria-valuemax="100" aria-valuenow="' + pct + '"><div class="xp-bar-fill" style="width:' + pct + '%"></div></div><p class="rw-progress-note">' + (status.nextLevel ? 'Faltam <b>' + status.xpToNext + ' XP</b> para o próximo nível.' : 'Acompanhe os benefícios disponíveis para você.') + '</p>' : '<p class="rw-progress-note">Entre para acompanhar seu XP, liberar benefícios e guardar seus cupons.</p><button class="btn btn-primary" type="button" data-rewards-login>Entrar na minha conta</button>') +
      "<div class=\"rw-member-bottom\"><span>SG 034</span><span>ESTILO QUE EVOLUI COM VOCÊ</span></div></section>";
    var metrics = '<div class="rw-metrics"><div><b>' + (session ? available : rewards.length) + '</b><span>' + (session ? 'Liberadas para você' : 'Recompensas no ar') + '</span></div><div><b>' + redemptions.length + "</b><span>Resgates na conta</span></div><a href=\"/conta\"><span>Seu histórico</span><b>Ver XP <span aria-hidden=\"true\"></span></b></a></div>";
    var roadmap = levels.length ? "<section class=\"rw-section\"><div class=\"rw-section-head\"><div><p class=\"rw-eyebrow\">SUA EVOLUÇÃO</p><h2>Do primeiro passo ao próximo nível.</h2></div><a class=\"text-link\" href=\"/ranking\">Ver ranking </a></div><ol class=\"rw-levels\">" + levels.map(function (l) {
      var current = status && l.levelNumber === myLevel;
      var done = status && l.xpRequired <= status.totalXp;
      return '<li class="rw-level' + (current ? ' is-current' : '') + (done ? ' is-unlocked' : '') + '"><div class="rw-level-top"><span class="rw-level-index">' + String(l.levelNumber).padStart(2, '0') + '</span><span class="rw-level-state">' + (current ? 'Seu nível' : done ? 'Alcançado' : l.xpRequired + ' XP') + '</span></div>' + gemHtml(l.levelNumber) + '<span class="rw-gem-name">' + levelGem(l.levelNumber).name + '</span><h3>' + esc(l.name) + '</h3><p>' + l.xpRequired + ' XP acumulados</p>' + (l.benefits.length ? '<ul>' + l.benefits.map(function (b) { return '<li>' + esc(b) + '</li>'; }).join('') + '</ul>' : '') + '</li>';
    }).join('') + '</ol></section>' : '';
    var earn = "<section class=\"rw-earn\" aria-label=\"Como ganhar XP\"><div><p class=\"rw-eyebrow\">CADA PASSO SOMA</p><h2>Seu estilo. Sua evolução.</h2></div><a href=\"/conta/pedidos\"><b>01 <span>Pedidos pagos</span></b><strong>R$ 1 = 1 XP</strong><small>XP após a confirmação do pagamento.</small></a><a href=\"/comunidade\"><b>02 <span>Seu visual no mural</span></b><strong>+30 XP</strong><small>Por foto aprovada pela equipe. Poste seu visual </small></a></section>";
    function card(r) {
      var mine = redeemed[r.id];
      var locked = !!r.requirementLevel && myLevel < r.requirementLevel;
      var action;
      if (mine) action = mine.couponCode ? couponHtml(mine.couponCode) : "<p class=\"reward-coupon\">Resgatado . a equipe entra em contato.</p>";
      else if (pending.has(r.id)) action = '<button class="btn btn-primary" type="button" data-redeem="' + esc(r.id) + '" aria-busy="true" disabled>Resgatando…</button>';
      else if (session && locked) action = '<button class="btn btn-ghost" type="button" disabled>Nível ' + r.requirementLevel + ' necessário</button>';
      else action = '<button class="btn btn-primary" type="button" data-redeem="' + esc(r.id) + '">' + (session ? t('rewards.redeem') : 'Entrar para resgatar') + '</button>';
      return '<article class="reward-card' + (locked && !mine ? ' is-locked' : '') + (mine ? ' is-redeemed' : '') + '"><div class="rw-reward-top"><p class="reward-kind">' + esc(KIND[r.kind] || r.kind.toUpperCase()) + '</p><span class="rw-reward-state">' + (mine ? 'Resgatado' : locked && session ? 'A desbloquear' : 'Disponível') + '</span></div><div class="rw-reward-art" aria-hidden="true">' + (r.discountPercent ? '<b>' + Number(r.discountPercent) + '<small>%</small></b><span>DE DESCONTO</span>' : '<b>034</b><span>' + esc(KIND[r.kind] || 'BENEFÍCIO') + ' / MEMBERS CLUB</span>') + '</div><h3>' + esc(r.title) + '</h3><p>' + esc(r.description) + '</p><p class="reward-requirement">' + (r.requirementLevel ? 'Nível ' + r.requirementLevel + (levelName[r.requirementLevel] ? ". " + esc(levelName[r.requirementLevel]) : '') + '+' : 'Livre para todos') + '</p><div data-reward-action="' + esc(r.id) + '">' + action + '</div></article>';
    }
    var xpHistory = session ? "<section class=\"rw-section rw-history\"><div class=\"rw-section-head\"><div><p class=\"rw-eyebrow\">MOVIMENTAÇÕES</p><h2>Seu XP, passo a passo.</h2></div><a class=\"text-link\" href=\"/conta\">Ver tudo </a></div>" + (history.length ? '<ul class="rw-history-list">' + history.map(function (entry) {
      var label = entry.note || ({ order_paid: 'Pedido pago', community_approved: 'Visual aprovado', community_post_approved: 'Visual aprovado' })[entry.reason] || 'XP registrado';
      return '<li><span class="rw-history-icon" aria-hidden="true">' + (entry.amount > 0 ? '↗' : '↘') + '</span><div><b>' + esc(label) + '</b><small>' + esc(dateLabel(entry.createdAt)) + '</small></div><strong class="' + (entry.amount > 0 ? 'is-positive' : '') + '">' + (entry.amount > 0 ? '+' : '') + entry.amount + '<span> XP</span></strong></li>';
    }).join('') + '</ul>' : "<div class=\"rw-history-empty\"><span aria-hidden=\"true\"></span><div><b>Sua jornada está começando.</b><p>Pedidos pagos e fotos aprovadas aparecem aqui quando o XP for registrado.</p></div></div>") + '</section>' : '';
    var guide = "<section class=\"rw-guide\"><div><p class=\"rw-eyebrow\">DO RESGATE AO CHECKOUT</p><h2>Um benefício. Três passos.</h2></div><ol><li><span>01</span><div><b>Escolha sua recompensa</b><p>Veja o nível necessário e os detalhes do benefício.</p></div></li><li><span>02</span><div><b>Resgate na sua conta</b><p>Os benefícios resgatados ficam em Meus resgates.</p></div></li><li><span>03</span><div><b>Use seu cupom</b><p>Copie o código e aplique no campo Cupom do checkout.</p></div></li></ol></section><section class=\"rw-faq\" aria-label=\"Dúvidas sobre recompensas\"><details><summary>Quando meu XP entra na conta?</summary><p>Pedidos geram 1 XP por R$1 após a confirmação do pagamento. Cada foto aprovada pela equipe na comunidade soma 30 XP.</p></details><details><summary>Por que uma recompensa está bloqueada?</summary><p>Alguns benefícios exigem um nível mínimo. O cartão mostra o nível necessário; acompanhe seu progresso para saber quanto XP falta.</p></details><details><summary>Onde encontro meu cupom depois do resgate?</summary><p>Na aba Meus resgates. Copie o código e aplique no checkout. O desconto é conferido antes de concluir o pedido, conforme as regras do cupom.</p></details></section><footer class=\"rw-footer\"><b>STREET GOOSE <span>034</span></b><span>MEMBERS CLUB SUA PRESENÇA, SEU PRÓXIMO NÍVEL.</span></footer>";
    var list = activeTab === 'wallet' ? redemptions.map(function (r) {
      return '<article class="reward-card is-redeemed"><div class="rw-reward-top"><p class="reward-kind">MEU RESGATE</p><span class="rw-reward-state">Na sua conta</span></div><h3>' + esc(r.title) + '</h3>' + (r.couponCode ? couponHtml(r.couponCode) : '<p>A equipe entra em contato sobre seu benefício.</p>') + '<p class="reward-requirement">Resgate registrado · ' + esc(dateLabel(r.redeemedAt)) + '</p></article>';
    }).join('') : rewards.map(card).join('');
    var empty = '<div class="rw-empty"><span class="rw-empty-mark" aria-hidden="true">034</span><div><h3>' + (activeTab === 'wallet' ? 'Seus resgates ficam aqui.' : 'O próximo benefício começa aqui.') + '</h3><p>' + (activeTab === 'wallet' ? 'Resgate uma recompensa disponível para guardar seu cupom nesta área.' : 'Ainda não há recompensas publicadas. Continue acumulando XP; os benefícios aparecem quando a equipe liberar.') + "</p><a class=\"text-link\" href=\"/comunidade\">Explorar a comunidade </a></div></div>";
    bodyEl.innerHTML = "<div class=\"rw-intro\"><p class=\"rw-eyebrow\">SG 034. RECOMPENSAS</p><h2>Presença tem <em>valor.</em></h2><p>Acumule XP. Evolua de nível. Aproveite o que a Street Goose preparou para você.</p></div>" + '<div class="rw-overview">' + hero + metrics + '</div>' +
      '<section class="rw-section"><div class="rw-section-head"><div><p class="rw-eyebrow">SEUS BENEFÍCIOS</p><h2>Recompensas & cupons</h2></div></div><div class="rw-tabs" role="tablist" aria-label="Recompensas"><button type="button" role="tab" aria-controls="rw-benefits-panel" aria-selected="' + (activeTab === 'available') + '" data-reward-tab="available">Recompensas <span>' + rewards.length + '</span></button><button type="button" role="tab" aria-controls="rw-benefits-panel" aria-selected="' + (activeTab === 'wallet') + '" data-reward-tab="wallet">Meus resgates <span>' + redemptions.length + '</span></button></div><div id="rw-benefits-panel" role="tabpanel" aria-label="' + (activeTab === 'wallet' ? 'Meus resgates' : 'Recompensas') + '">' + (list ? '<div class="rewards-grid">' + list + '</div>' : empty) + '</div></section>' + roadmap + earn + xpHistory + guide;
    var selectedTab = bodyEl.querySelector('[data-reward-tab="' + activeTab + '"]');
    if (focusTab && selectedTab) selectedTab.focus({ preventScroll: true });
    focusTab = false;

  }

  bodyEl.addEventListener("click", async function (e) {
    if (e.target.closest("[data-rewards-retry]")) { render(true); return; }
    var tab = e.target.closest("[data-reward-tab]");
    if (tab) { activeTab = tab.getAttribute("data-reward-tab"); focusTab = true; render(); return; }
    if (e.target.closest("[data-rewards-login]")) { if (window.SG.auth) window.SG.auth.open(); return; }
    var copy = e.target.closest("[data-copy-coupon]");
    if (copy) {
      try {
        var code = copy.getAttribute('data-copy-coupon');
        await navigator.clipboard.writeText(code);
        copiedCodes.add(code);
        bodyEl.querySelectorAll('[data-copy-coupon]').forEach(function (node) {
          if (node.getAttribute('data-copy-coupon') !== code) return;
          node.querySelector('span').textContent = 'Copiado';
          node.closest('.rw-ticket').querySelector('.rw-copy-feedback').textContent = 'Código copiado. Pronto para usar no checkout.';
        });
        if (window.SG.toast) window.SG.toast('CUPOM COPIADO');
      } catch (err) { if (window.SG.toast) window.SG.toast('NÃO FOI POSSÍVEL COPIAR. SELECIONE O CÓDIGO DO CUPOM.'); }
      return;
    }
    var btn = e.target.closest("[data-redeem]");
    if (!btn) return;
    var id = btn.getAttribute("data-redeem");
    if (pending.has(id)) return;
    pending.add(id);
    btn.disabled = true;
    btn.setAttribute('aria-busy', 'true');
    var originalText = btn.textContent;
    btn.textContent = 'Resgatando…';
    try {
      var session = window.SG.auth ? await window.SG.auth.getSession() : null;
      if (!session) { if (window.SG.auth) window.SG.auth.open(); return; }
      var res = await svc.redeem(id);
      if (destroyed) return;
      if (res.ok) {
        var box = bodyEl.querySelector('[data-reward-action="' + id + '"]');
        if (box) { box.closest('.reward-card').classList.add('is-redeemed'); box.innerHTML = res.couponCode ? couponHtml(res.couponCode) : "<p class=\"reward-coupon\">Resgatado . a equipe entra em contato.</p>"; }
        render(true);
        if (window.SG.toast) window.SG.toast('RECOMPENSA RESGATADA');
      } else if (window.SG.toast) window.SG.toast((MESSAGES[res.reason] || 'Não foi possível resgatar agora.').toUpperCase());
    } catch (err) {
      if (!destroyed && window.SG.toast) window.SG.toast('FALHA NA CONEXÃO. TENTE RESGATAR NOVAMENTE.');
    } finally {
      pending.delete(id);
      var currentBtn = Array.from(bodyEl.querySelectorAll('[data-redeem]')).find(function (node) { return node.getAttribute('data-redeem') === id; });
      if (currentBtn) { currentBtn.disabled = false; currentBtn.removeAttribute('aria-busy'); currentBtn.textContent = originalText; }
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
      setTimeout(function () { if (!destroyed) { dataCache = null; render(true); } }, 0);
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
