/* Consistent visual identity for each real XP level; thresholds remain server data. */
export const LEVEL_GEMS = [
  { name: 'Quartzo', cut: 'prism', meaning: 'O início da sua presença.', outline: '32,3 47,16 47,46 32,61 17,46 17,16', color: '#a9d4df', sides: 6 },
  { name: 'Esmeralda', cut: 'step', meaning: 'Consistência que ganha forma.', outline: '20,9 44,9 55,20 55,44 44,55 20,55 9,44 9,20', color: '#64e6b2', sides: 4 },
  { name: 'Safira', cut: 'oval', meaning: 'Confiança para ir além.', outline: '32,5 46,10 55,24 55,40 46,54 32,59 18,54 9,40 9,24 18,10', color: '#75abff', sides: 8 },
  { name: 'Ametista', cut: 'cluster', meaning: 'Sua identidade, sem limites.', outline: '9,47 9,31 20,18 25,30 25,13 32,2 40,14 40,32 48,22 56,34 56,48 32,60', color: '#c79aff', sides: 5 },
  { name: 'Topázio', cut: 'pear', meaning: 'Uma trajetória que se ilumina.', outline: '32,3 47,25 55,39 49,52 32,61 15,52 9,39 17,25', color: '#f3cf77', sides: 6 },
  { name: 'Rubi', cut: 'trillion', meaning: 'A intensidade de quem inspira.', outline: '32,6 60,53 4,53', color: '#ff819e', sides: 3 },
  { name: 'Diamante', cut: 'brilliant', meaning: 'O legado lapidado pelo tempo.', outline: '17,10 47,10 61,27 32,60 3,27', color: '#e9e8ff', sides: 8 },
];
// Podium symbols are distinct from the XP stone earned by each participant.
export const PODIUM_GEM_LEVELS = Object.freeze([7, 6, 5]);
export function levelGem(level) {
  return LEVEL_GEMS[Math.max(0, Math.min(LEVEL_GEMS.length - 1, (Number(level) || 1) - 1))];
}
const tierNumber = level => Math.max(1, Math.min(LEVEL_GEMS.length, Math.round(Number(level)) || 1));
/* Still render of the same refractive crystal shown live (brand/level-gems).
   It is what you see before WebGL starts, and the fallback without it. */
export function gemPosterSrc(level) {
  return '/brand/level-gems/level-' + tierNumber(level) + '.png?v=2';
}
export function gemHtml(level) {
  const n = tierNumber(level);
  const gem = levelGem(n);
  return '<span class="sg-level-gem sg-level-gem--' + gem.cut + '" data-gem-slot data-level="' + n + '" style="--gem-color:' + gem.color + '" role="img" aria-label="' + gem.name + ', nível ' + n + '"><img class="sg-level-gem-poster" src="' + gemPosterSrc(n) + '" alt="" width="96" height="112" decoding="async" loading="lazy"></span>';
}
let medalSerial = 0;
/* Struck-metal medal: satin ribbon with a fold, metal loop, milled rim,
   polished bevel, engraved laurels; the place number sits on top in HTML. */
export function medalHtml(position) {
  if (position > 3) return '<span class="ranking-number">' + String(position).padStart(2, '0') + '</span>';
  const name = ['ouro', 'prata', 'bronze'][position - 1];
  const id = 'sg-medal-' + (++medalSerial);
  // highlight, light, mid, shadow, deep
  const m = position === 1 ? ['#fffbe0', '#f9df8a', '#d9a63c', '#8f5a12', '#4a2c06']
    : position === 2 ? ['#ffffff', '#e8eef8', '#aab6c9', '#5d6a80', '#2a3242']
    : ['#ffe6c8', '#e8b48a', '#b46f45', '#6b3a22', '#36190c'];
  const ribbon = position === 1 ? ['#1b2a5c', '#3150a8', '#0d1636'] : position === 2 ? ['#1d2f55', '#3a5a9a', '#0c1630'] : ['#281b4f', '#4a3497', '#130b2b'];
  const stripe = position === 1 ? '#e8c46a' : position === 2 ? '#d7dee9' : '#d39a6f';
  const leaves = Array.from({ length: 7 }, (_, k) => {
    const a = (200 + k * 21) * Math.PI / 180, r = 17.2, x = 32 + Math.cos(a) * r, y = 49 + Math.sin(a) * r, rot = (200 + k * 21) + 70;
    const b = (340 - k * 21) * Math.PI / 180, x2 = 32 + Math.cos(b) * r, y2 = 49 + Math.sin(b) * r, rot2 = (340 - k * 21) - 70;
    return '<ellipse cx="' + x.toFixed(2) + '" cy="' + y.toFixed(2) + '" rx="1.15" ry="2.6" transform="rotate(' + rot + ' ' + x.toFixed(2) + ' ' + y.toFixed(2) + ')"/><ellipse cx="' + x2.toFixed(2) + '" cy="' + y2.toFixed(2) + '" rx="1.15" ry="2.6" transform="rotate(' + rot2 + ' ' + x2.toFixed(2) + ' ' + y2.toFixed(2) + ')"/>';
  }).join('');
  return `<span class="ranking-medal ranking-medal--${position}" role="img" aria-label="${position}º lugar, medalha de ${name}"><svg viewBox="0 0 64 76" aria-hidden="true"><defs>
    <linearGradient id="${id}-rib" x1="0" y1="0" x2="1" y2="0"><stop stop-color="${ribbon[2]}"/><stop offset=".3" stop-color="${ribbon[1]}"/><stop offset=".55" stop-color="${ribbon[0]}"/><stop offset=".8" stop-color="${ribbon[1]}"/><stop offset="1" stop-color="${ribbon[2]}"/></linearGradient>
    <linearGradient id="${id}-rim" x1=".15" y1="0" x2=".85" y2="1"><stop stop-color="${m[0]}"/><stop offset=".22" stop-color="${m[1]}"/><stop offset=".5" stop-color="${m[2]}"/><stop offset=".72" stop-color="${m[3]}"/><stop offset=".88" stop-color="${m[2]}"/><stop offset="1" stop-color="${m[4]}"/></linearGradient>
    <linearGradient id="${id}-bevel" x1=".85" y1="1" x2=".15" y2="0"><stop stop-color="${m[0]}"/><stop offset=".35" stop-color="${m[1]}"/><stop offset=".7" stop-color="${m[3]}"/><stop offset="1" stop-color="${m[4]}"/></linearGradient>
    <radialGradient id="${id}-face" cx=".36" cy=".3" r=".85"><stop stop-color="${m[0]}"/><stop offset=".35" stop-color="${m[1]}"/><stop offset=".75" stop-color="${m[2]}"/><stop offset="1" stop-color="${m[3]}"/></radialGradient>
    <linearGradient id="${id}-shine" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#fff" stop-opacity=".85"/><stop offset=".45" stop-color="#fff" stop-opacity="0"/></linearGradient>
  </defs>
  <path d="M15 1h12l9 24-8 6Z" fill="url(#${id}-rib)"/><path d="M37 1h12l-13 30-8-6Z" fill="url(#${id}-rib)"/>
  <path d="M19.5 1h3l8.2 21.8-2 1.6Z" fill="${stripe}" opacity=".9"/><path d="M41.5 1h3l-10.6 24.6-2-1.5Z" fill="${stripe}" opacity=".9"/>
  <path d="M28 25l8 6 8-6" fill="none" stroke="#000" stroke-opacity=".35" stroke-width="1.4"/>
  <ellipse cx="32" cy="29.5" rx="4.2" ry="2.6" fill="none" stroke="url(#${id}-rim)" stroke-width="2"/>
  <circle cx="32" cy="50" r="24.5" fill="#000" opacity=".35"/>
  <circle cx="32" cy="49" r="24" fill="url(#${id}-rim)"/>
  <circle cx="32" cy="49" r="23.1" fill="none" stroke="${m[4]}" stroke-opacity=".55" stroke-width="1.3" stroke-dasharray=".7 1.05"/>
  <circle cx="32" cy="49" r="20.6" fill="url(#${id}-bevel)"/>
  <circle cx="32" cy="49" r="19" fill="url(#${id}-face)"/>
  <circle cx="32" cy="49" r="19" fill="none" stroke="${m[4]}" stroke-opacity=".45" stroke-width=".8"/>
  <g fill="${m[3]}" opacity=".55">${leaves}</g>
  <path d="M27.5 35.5l1.6-3.2 2.9 2.2 2.9-2.2 1.6 3.2Z" fill="${m[1]}" stroke="${m[3]}" stroke-width=".5"/>
  <path d="M14 42a19 19 0 0 1 27-11" fill="none" stroke="url(#${id}-shine)" stroke-width="3" stroke-linecap="round"/>
  <path d="M47.5 34l.7-2.6.7 2.6 2.6.7-2.6.7-.7 2.6-.7-2.6-2.6-.7Z" fill="#fff" opacity=".9"/>
</svg><b>${position}</b></span>`;
}
/* Live crystal layer over every gemHtml() slot inside root (lazy, one WebGL
   context per root). Call again after replacing root.innerHTML, or use
   refresh() when only part of it changed. */
export function liveGems(root, options) {
  let field = null, dead = false, paused = false;
  // Calm tier: the posters are the same render, frozen; no WebGL at all.
  if (window.SG && window.SG.perfTier === 'low') return { refresh() {}, setPaused() {}, destroy() {} };
  const retire = () => { field?.destroy(); field = null; dead = true; };
  window.addEventListener('sg:perf-low', retire, { once: true });
  if (getComputedStyle(root).position === 'static') root.style.position = 'relative';
  import('../src/components/ranking-crystal/gem-field.ts')
    .then(mod => { if (dead || !root.isConnected) return; field = mod.mountGemField(root, options); if (paused) field.setPaused(true); })
    .catch(error => console.warn('[SG034] Crystal module failed to load, keeping gem posters.', error));
  return {
    refresh() { field?.refresh(); },
    setPaused(value) { paused = value; field?.setPaused(value); },
    destroy() { dead = true; window.removeEventListener('sg:perf-low', retire); field?.destroy(); field = null; },
  };
}
