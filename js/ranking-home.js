import { RewardsService } from '../src/services/RewardsService.ts';
import { gemHtml, levelGem, medalHtml } from './level-gems.js';
export async function mountRankingHome(root) {
  const list = root.querySelector('[data-ranking-preview-list]');
  const esc = window.SG.esc;
  const avatar = r => {
    let url = '';
    try { const parsed = new URL(r.avatarUrl); if (parsed.protocol === 'https:') url = parsed.href; } catch (_) {}
    const initial = esc((r.handle || 'G').charAt(0).toUpperCase());
    return '<span class="sg-rank-avatar" aria-hidden="true" data-initial="' + initial + '">' + (url ? '<img src="' + esc(url) + '" alt="" loading="lazy" decoding="async" referrerpolicy="no-referrer">' : initial) + '</span>';
  };
  const card = (r, i) => {
    const gem = levelGem(r.level);
    return '<article class="sg-ranking-preview-card sg-ranking-preview-card--' + (i + 1) + '" style="--gem-color:' + gem.color + '">' +
      '<div class="sg-rank-medal">' + medalHtml(i + 1) + '</div>' +
      '<div class="sg-rank-body"><p class="sg-rank-pos" aria-hidden="true">' + (i + 1) + 'º lugar</p>' +
      '<h3 class="sg-rank-id">' + avatar(r) + '<b>' + esc(r.handle) + '</b></h3>' +
      '<p class="sg-rank-meta"><span class="sg-rank-xp"><strong>' + r.totalXp.toLocaleString('pt-BR') + '</strong> XP</span><span class="sg-rank-level">Nível ' + r.level + ' · ' + esc(gem.name) + '</span></p></div>' +
      '<div class="sg-rank-stone" data-crystal-slot data-level="' + r.level + '">' + gemHtml(r.level) + '</div></article>';
  };
  try {
    const page = await RewardsService.getRankingPage(0, 3);
    if (!root.isConnected) return;
    root._sgCrystals?.();
    list.innerHTML = page.rows.length ? page.rows.map(card).join('') : '<p class="sg-ranking-preview-empty">A primeira estrela pode ser você. Entre na sua conta para começar.</p>';
    list.querySelectorAll('.sg-rank-avatar img').forEach(img => img.addEventListener('error', () => { const host = img.parentElement; host.textContent = host.dataset.initial; }, { once: true }));
    if (page.rows.length) {
      import('../src/components/ranking-crystal/ranking-crystals.ts')
        .then(mod => { if (root.isConnected) root._sgCrystals = mod.mountRankingCrystals(list); })
        .catch(error => console.warn('[SG034] Ranking crystal module failed to load, keeping SVG gems.', error));
    }
  } catch (_) { list.innerHTML = '<p class="sg-ranking-preview-empty">Explore o ranking para acompanhar os participantes e sua evolução.</p>'; }
}
