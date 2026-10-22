import { gemHtml, gemPosterSrc, levelGem, liveGems, medalHtml, PODIUM_GEM_LEVELS } from './level-gems.js';
import './ranking-cinematic.css';
import { mountRankingScene } from './ranking-scene.js';
import { mountRankingNumbers } from './ranking-numbers.js';

export function mountRankingPage(root, _params, onClose) {
  const esc = window.SG.esc;
  const fmt = value => Number(value || 0).toLocaleString('pt-BR');
  root.classList.add('is-ranking');
  root.innerHTML = "<div class=\"ranking-galaxy\" aria-hidden=\"true\"></div><div class=\"app-page-head ranking-page-head\"><div><p class=\"ranking-kicker\">STREET GOOSE CONSTELAÇÃO 034</p><h1>Ranking Street Goose</h1></div><button class=\"app-page-close\" type=\"button\" data-app-close aria-label=\"Fechar ranking\"><svg viewBox=\"0 0 24 24\" aria-hidden=\"true\"><path d=\"M6 6l12 12M18 6L6 18\"/></svg></button></div><div class=\"app-page-body ranking-page-body\" data-ranking-body><div class=\"ranking-loading\" role=\"status\">Conectando ao universo 034…</div></div>";
  const body = root.querySelector('[data-ranking-body]');
  let destroyed = false, version = 0, stopScene = null, gems = null, stopNumbers = null, unsubscribe = null, timer = null, svc = null;
  let rows = [], total = 0, levels = [], me = null, busy = false, session = null;
  function avatar(r) {
    let url = '';
    try { const parsed = new URL(r.avatarUrl); if (parsed.protocol === 'https:') url = parsed.href; } catch (_) {}
    return '<span class="ranking-avatar">' + (url ? '<img src="' + esc(url) + '" alt="" loading="lazy" referrerpolicy="no-referrer">' : esc((r.handle || 'G').charAt(0).toUpperCase())) + '</span>';
  }
  function myHtml() {
    if (!session) return "<div class=\"ranking-me\"><div><span class=\"ranking-kicker\">SUA JORNADA</span><p>Entre para acompanhar seu lugar na constelação.</p></div><button class=\"ranking-soft-button\" type=\"button\" data-ranking-login>Entrar na conta </button></div>";
    if (!me) return '<div class="ranking-me"><p>Sua posição está indisponível agora.</p><button class="ranking-soft-button" data-ranking-refresh type="button">Atualizar</button></div>';
    return '<div class="ranking-me' + (me.optedIn ? ' is-in' : '') + '">' + gemHtml(me.level) + '<div><span class="ranking-kicker">' + (me.optedIn ? 'SEU LUGAR NA CONSTELAÇÃO' : 'SUA JORNADA CONTINUA') + '</span><p>' + (me.optedIn && me.position != null ? '<b>' + me.position + 'º</b> de ' + fmt(me.participants) + ' participantes' : 'Seu perfil está fora do ranking público.') + '<small>' + fmt(me.totalXp) + " XP " + esc((levels.find(l => l.levelNumber === me.level) || {}).name || 'Nível ' + me.level) + '</small></p></div><a class="ranking-soft-button" href="/conta">' + (me.optedIn ? "Minha evolução " : "Entrar no ranking ") + '</a></div>';
  }
  function sceneHtml() {
    const leaders = rows.slice(0, 3);
    return '<section class="ranking-stage" data-ranking-stage aria-label="Pódio dos três primeiros"><div class="ranking-stage-top"><span>THE 034 CONSTELLATION</span><span class="ranking-stage-live">XP REAL</span></div><canvas aria-hidden="true"></canvas><div class="ranking-stage-gems" aria-hidden="true">' + [0, 1, 2].map(i => '<span class="ranking-stage-gem ranking-stage-gem--' + (i + 1) + '" data-gem-slot data-podium="' + i + '" data-level="' + PODIUM_GEM_LEVELS[i] + '"><img class="sg-level-gem-poster" src="' + gemPosterSrc(PODIUM_GEM_LEVELS[i]) + '" alt="" decoding="async"></span>').join('') + '</div><div class="ranking-stage-fallback" aria-hidden="true">' + [1, 0, 2].map(i => '<div class="ranking-plinth ranking-plinth--' + (i + 1) + '">' + gemHtml(PODIUM_GEM_LEVELS[i]) + '<b>' + (i + 1) + '</b></div>').join('') + '</div><div class="ranking-stage-leaders">' + [1, 0, 2].map(i => {
      const r = leaders[i];
      return '<div class="ranking-stage-member ranking-stage-member--' + (i + 1) + '" data-podium-level="' + PODIUM_GEM_LEVELS[i] + '">' + medalHtml(i + 1) + '<b>' + (r ? esc(r.handle) : 'Lugar em aberto') + '</b><span>' + (r ? fmt(r.totalXp) + ' XP' : 'A próxima estrela pode ser você') + '</span><small class="ranking-stage-stone">' + esc(levelGem(PODIUM_GEM_LEVELS[i]).name) + " " + esc((levels.find(l => l.levelNumber === PODIUM_GEM_LEVELS[i]) || {}).name || 'Nível ' + PODIUM_GEM_LEVELS[i]) + '</small></div>';
    }).join('') + "</div><div class=\"ranking-stage-bottom\"><span>ESTILO PRESENÇA LEGADO</span><button type=\"button\" data-scene-toggle aria-pressed=\"false\">Pausar animação</button></div></section>";
  }
  function rowHtml(r, i) {
    const mine = session && r.userId === session.user.id;
    const name = (levels.find(l => l.levelNumber === r.level) || {}).name || 'Nível ' + r.level;
    return '<li class="ranking-row ranking-row--' + (i + 1) + (mine ? ' is-me' : '') + '">' + medalHtml(i + 1) + avatar(r) + '<div class="ranking-person"><b>' + esc(r.handle) + (mine ? '<small>VOCÊ</small>' : '') + '</b><span>' + esc(name) + '</span></div><span class="ranking-level-gem">' + gemHtml(r.level) + '</span><span class="ranking-xp"><b data-rank-value="' + Number(r.totalXp) + '">' + fmt(r.totalXp) + '</b><small>XP</small></span></li>';
  }
  function listHtml() {
    return rows.length ? '<ol class="ranking-list" aria-label="Classificação por XP">' + rows.map(rowHtml).join('') + '</ol>' : '<div class="ranking-empty"><h3>A primeira estrela pode ser você.</h3><p>Novas contas entram automaticamente. Quem já tem conta pode ativar a participação em Minha conta.</p></div>';
  }
  function paginationHtml() {
    return '<span role="status" data-ranking-count>' + rows.length + ' de ' + fmt(total) + ' participantes</span>' + (rows.length < total ? "<button type=\"button\" class=\"ranking-soft-button\" data-ranking-more>Carregar mais participantes </button>" : '') + '<p data-ranking-list-error role="status"></p>';
  }
  function paint() {
    body.innerHTML = '<div class="ranking-hero"><div class="ranking-lead"><p class="ranking-kicker">CADA CONQUISTA DEIXA UM RASTRO</p><h2>Estrelas em<br><em>ascensão.</em></h2><p>Seu estilo ganha presença. Sua presença vira legado. Conheça quem está no topo do universo 034.</p><div class="ranking-hero-stats"><div><b data-rank-value="' + Number(total) + '">' + fmt(total) + '</b><span>participantes</span></div><div><b data-rank-value="' + levels.length + '">' + levels.length + "</b><span>níveis para conquistar</span></div></div><a class=\"ranking-soft-button\" href=\"#ranking-completo\">Explorar o ranking </a></div>" + sceneHtml() + '</div>' + myHtml() + "<section class=\"ranking-board\" id=\"ranking-completo\"><div class=\"ranking-section-head\"><div><p class=\"ranking-kicker\">A CONSTELAÇÃO COMPLETA</p><h2>Cada nome. Uma trajetória.</h2></div><button type=\"button\" class=\"ranking-soft-button\" data-ranking-refresh>Atualizar </button></div><p class=\"ranking-board-note\">Ordenado por XP. Em empate, quem entrou primeiro vem antes. Diamante, Rubi e Topázio simbolizam os três palcos; a pedra do seu perfil é conquistada pelo seu nível de XP.</p><div data-ranking-list>" + listHtml() + '</div><div class="ranking-pagination" data-ranking-pagination>' + paginationHtml() + '</div></section>' + (levels.length ? "<section class=\"ranking-gem-collection\"><div class=\"ranking-section-head\"><div><p class=\"ranking-kicker\">SETE PEDRAS. UM LEGADO.</p><h2>Sua evolução tem uma assinatura.</h2></div><a class=\"ranking-soft-button\" href=\"/recompensas\">Ver benefícios </a></div><ol>" + levels.map(l => {
      const gem = levelGem(l.levelNumber);
      const current = me && me.level === l.levelNumber;
      const unlocked = me && Number(me.totalXp) >= Number(l.xpRequired);
      const state = current ? 'SEU NÍVEL' : unlocked ? 'DESBLOQUEADA' : me ? 'FALTAM ' + fmt(Math.max(0, Number(l.xpRequired) - Number(me.totalXp))) + ' XP' : 'NÍVEL ' + l.levelNumber;
      return '<li class="gem-cut-' + gem.cut + (current ? ' is-current' : unlocked ? ' is-unlocked' : '') + '" style="--gem-color:' + gem.color + '">' + gemHtml(l.levelNumber) + '<span>' + esc(gem.name) + '</span><b>' + esc(l.name) + '</b><small>' + fmt(l.xpRequired) + ' XP</small><p class="ranking-gem-meaning">' + esc(gem.meaning) + '</p><span class="ranking-gem-state">' + state + '</span></li>';
    }).join('') + '</ol></section>' : '') + "<aside class=\"ranking-shop-cta\"><div><p class=\"ranking-kicker\">SUA PRÓXIMA CONQUISTA COMEÇA AQUI</p><h3>Seu estilo também<br>pode virar XP.</h3><p>Pedidos pagos e fotos aprovadas na comunidade fazem sua constelação crescer.</p></div><a class=\"ranking-shop-button\" href=\"/categoria/lupas\">Explorar coleção </a></aside><p class=\"ranking-rules\">Pedidos pagos: 1 XP por R$1, mínimo 50 XP. Foto aprovada: +30 XP. Reembolso reverte o XP. Você pode sair do ranking público nas configurações da sua conta.</p>";
    stopNumbers = mountRankingNumbers(body);
    const v = version;
    mountRankingScene(body.querySelector('[data-ranking-stage]')).then(dispose => {
      if (destroyed || v !== version) dispose(); else stopScene = dispose;
    });
    if (gems) gems.destroy();
    gems = liveGems(body, { clampToViewport: true, hoverSelector: '.ranking-row, .ranking-gem-collection li', alwaysDark: true });
    gems.setPaused(!!root.classList.contains('ranking-motion-paused'));
    body.querySelectorAll('.ranking-avatar img').forEach(img => img.addEventListener('error', () => { img.parentElement.textContent = 'G'; }, { once: true }));
  }
  async function load() {
    const v = ++version;
    busy = true;
    if (stopScene) { stopScene(); stopScene = null; }
    if (gems) { gems.destroy(); gems = null; }
    if (stopNumbers) { stopNumbers(); stopNumbers = null; }
    try {
      svc = (await import('../src/services/RewardsService.ts')).RewardsService;
      session = window.SG.auth ? await window.SG.auth.getSession() : null;
      const results = await Promise.all([svc.getRankingPage(0, 25), svc.getLevels(), session ? svc.getMyRanking() : null]);
      if (destroyed || v !== version) return;
      rows = results[0].rows; total = results[0].total; levels = results[1]; me = results[2]; paint();
    } catch (_) {
      if (!destroyed && v === version) body.innerHTML = '<div class="ranking-empty" role="alert"><h2>O universo 034 está fora de alcance por um instante.</h2><p>Confira a conexão e tente novamente.</p><button class="ranking-soft-button" type="button" data-ranking-refresh>Tentar novamente</button></div>';
    } finally { if (v === version) busy = false; }
  }
  async function more(button) {
    if (busy) return;
    const v = version;
    busy = true; button.disabled = true; button.textContent = 'Carregando…';
    try {
      const next = await svc.getRankingPage(rows.length, 25);
      if (destroyed || v !== version) return;
      total = next.total;
      const ids = new Set(rows.map(r => r.userId));
      if (next.rows.some(r => ids.has(r.userId))) { await load(); return; }
      next.rows.forEach(r => { if (!ids.has(r.userId)) { rows.push(r); ids.add(r.userId); } });
      if (!next.rows.length && rows.length < total) { await load(); return; }
      body.querySelector('[data-ranking-list]').innerHTML = listHtml();
      if (gems) gems.refresh();
      if (stopNumbers) stopNumbers();
      stopNumbers = mountRankingNumbers(body);
      body.querySelector('[data-ranking-pagination]').innerHTML = paginationHtml();
    } catch (_) {
      if (!destroyed && v === version) { body.querySelector('[data-ranking-list-error]').textContent = 'Não carregou. Tente novamente.'; button.disabled = false; button.textContent = "Tentar carregar mais "; }
    } finally { if (v === version) busy = false; }
  }
  body.addEventListener('sg:ranking-motion', e => { if (gems) gems.setPaused(!!e.detail?.paused); });
  body.addEventListener('click', e => {
    if (e.target.closest('[data-ranking-login]') && window.SG.auth) window.SG.auth.open();
    if (e.target.closest('[data-ranking-refresh]') && !busy) load();
    const button = e.target.closest('[data-ranking-more]'); if (button) more(button);
    const anchor = e.target.closest('a[href="#ranking-completo"]'); if (anchor) { e.preventDefault(); body.querySelector('#ranking-completo').scrollIntoView({ behavior: window.SG.prefersReducedMotion() ? 'instant' : 'smooth' }); }
  });
  import('../src/services/AuthService.ts').then(m => {
    if (destroyed) return;
    let first = true;
    unsubscribe = m.AuthService.onAuthStateChange(() => { if (first) { first = false; return; } clearTimeout(timer); timer = setTimeout(() => { if (!destroyed) load(); }, 0); });
  });
  function focusRefresh() { if (!destroyed && !document.hidden && !busy) load(); }
  document.addEventListener('visibilitychange', focusRefresh);
  root.querySelector('[data-app-close]').addEventListener('click', onClose);
  function key(e) { if (e.key === 'Escape') onClose(); }
  document.addEventListener('keydown', key);
  load();
  return () => { destroyed = true; version++; clearTimeout(timer); if (stopScene) stopScene(); if (gems) gems.destroy(); if (stopNumbers) stopNumbers(); if (unsubscribe) unsubscribe(); document.removeEventListener('keydown', key); document.removeEventListener('visibilitychange', focusRefresh); root.classList.remove('is-ranking', 'ranking-motion-paused'); };
}
