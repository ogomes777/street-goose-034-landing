import { RewardsService } from '../src/services/RewardsService.ts';
import { gemHtml, medalHtml } from './level-gems.js';
export async function mountRankingHome(root) {
  const list = root.querySelector('[data-ranking-preview-list]');
  const esc = window.SG.esc;
  try {
    const page = await RewardsService.getRankingPage(0, 3);
    if (!root.isConnected) return;
    list.innerHTML = page.rows.length ? page.rows.map((r, i) => '<div class="sg-ranking-preview-card">' + medalHtml(i + 1) + '<div><b>' + esc(r.handle) + '</b><small>' + r.totalXp.toLocaleString('pt-BR') + " XP nível " + r.level + '</small></div>' + gemHtml(r.level) + '</div>').join('') : '<p class="sg-ranking-preview-empty">A primeira estrela pode ser você. Entre na sua conta para começar.</p>';
  } catch (_) { list.innerHTML = '<p class="sg-ranking-preview-empty">Explore o ranking para acompanhar os participantes e sua evolução.</p>'; }
}
