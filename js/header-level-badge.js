import './header-level-badge.css';
import { levelGem } from './level-gems.js';
import { RewardsService } from '../src/services/RewardsService.ts';
import { supabase } from '../src/lib/supabase.ts';

let userId = null;
let generation = 0;
let pending = false;
let timer = null;

function clearBadges() {
  document.querySelectorAll('.sg-header-level-badge').forEach(badge => badge.remove());
  document.querySelectorAll('.sg-header-avatar-wrap').forEach(wrap => wrap.removeAttribute('title'));
}

function renderLevel(level) {
  const description = `Nível ${level} · ${levelGem(level).name}`;
  document.querySelectorAll('[data-account-avatar], [data-account-avatar-mobile]').forEach(avatar => {
    let wrap = avatar.parentElement;
    if (!wrap.classList.contains('sg-header-avatar-wrap')) {
      wrap = document.createElement('span');
      wrap.className = 'sg-header-avatar-wrap';
      avatar.before(wrap);
      wrap.append(avatar);
    }
    wrap.title = description;
    let badge = wrap.querySelector('.sg-header-level-badge');
    if (!badge) {
      badge = document.createElement('span');
      badge.className = 'sg-header-level-badge';
      wrap.append(badge);
    }
    if (badge.dataset.level === String(level)) return;
    badge.dataset.level = String(level);
    badge.setAttribute('role', 'img');
    badge.setAttribute('aria-label', description);
    badge.style.setProperty('--gem-color', levelGem(level).color);
    badge.innerHTML = `<img src="/brand/level-gems/level-${level}.png" width="96" height="112" alt="" aria-hidden="true" decoding="async"><b aria-hidden="true">${level}</b>`;
  });
}

async function refresh() {
  if (!userId || pending || document.hidden || !supabase) return;
  const expectedUser = userId;
  const revision = generation;
  pending = true;
  try {
    const ranking = await RewardsService.getMyRanking();
    const { data } = await supabase.auth.getSession();
    if (revision !== generation || data.session?.user.id !== expectedUser) return;
    if (Number.isInteger(ranking?.level) && ranking.level >= 1 && ranking.level <= 7) {
      renderLevel(ranking.level);
    }
  } catch { /* A falha de rede não interfere no login ou na navbar. */ }
  finally { if (revision === generation) pending = false; }
}

export function updateHeaderLevelSession(session) {
  const nextUser = session?.user?.id || null;
  if (nextUser === userId) return;
  generation++;
  userId = nextUser;
  pending = false;
  clearBadges();
  clearInterval(timer);
  timer = null;
  if (userId) {
    void refresh();
    timer = setInterval(refresh, 60000);
  }
}

document.addEventListener('sg:notification', refresh);
document.addEventListener('visibilitychange', () => { if (!document.hidden) void refresh(); });
window.addEventListener('online', refresh);
