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
export function levelGem(level) {
  return LEVEL_GEMS[Math.max(0, Math.min(LEVEL_GEMS.length - 1, (Number(level) || 1) - 1))];
}
export function gemHtml(level) {
  const gem = levelGem(level);
  const points = gem.outline.split(' ').map(p => p.split(',').map(Number));
  return '<span class="sg-level-gem sg-level-gem--' + gem.cut + '" data-level="' + (Number(level) || 1) + '" style="--gem-color:' + gem.color + '" role="img" aria-label="' + gem.name + ', nível ' + (Number(level) || 1) + '"><svg viewBox="0 0 64 64" aria-hidden="true">' +
    points.map((p, i) => '<polygon points="32,32 ' + p.join(',') + ' ' + points[(i + 1) % points.length].join(',') + '" fill="currentColor" opacity="' + (.3 + (i % 4) * .18) + '"/>').join('') +
    '<polygon points="' + points.map(p => p.join(',')).join(' ') + '" fill="none" stroke="currentColor" stroke-width="1"/><path d="M24 23 32 16 40 24 32 35Z" fill="#fff" opacity=".45"/></svg></span>';
}
let medalSerial = 0;
export function medalHtml(position) {
  if (position > 3) return '<span class="ranking-number">' + String(position).padStart(2, '0') + '</span>';
  const name = ['ouro', 'prata', 'bronze'][position - 1];
  const id = 'sg-medal-' + (++medalSerial);
  const shades = position === 1 ? ['#fff8b6','#f8d56a','#bc781e','#6b3d0d'] : position === 2 ? ['#ffffff','#dce5f3','#8c9bb5','#465269'] : ['#ffe1b9','#dba077','#965235','#512c23'];
  return `<span class="ranking-medal ranking-medal--${position}" role="img" aria-label="${position}º lugar, medalha de ${name}"><svg viewBox="0 0 64 76" aria-hidden="true"><defs>
    <linearGradient id="${id}-ribbon" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#f75c67"/><stop offset=".32" stop-color="#a81735"/><stop offset=".52" stop-color="#ff9a9d"/><stop offset=".7" stop-color="#c3294c"/><stop offset="1" stop-color="#64152c"/></linearGradient>
    <linearGradient id="${id}-blue"><stop stop-color="#9fc5ff"/><stop offset=".35" stop-color="#2854ad"/><stop offset=".55" stop-color="#7ca6ec"/><stop offset="1" stop-color="#182c68"/></linearGradient>
    <linearGradient id="${id}-metal" x1=".1" y1="0" x2=".9" y2="1"><stop stop-color="${shades[0]}"/><stop offset=".25" stop-color="${shades[1]}"/><stop offset=".48" stop-color="${shades[0]}"/><stop offset=".64" stop-color="${shades[2]}"/><stop offset=".86" stop-color="${shades[1]}"/><stop offset="1" stop-color="${shades[3]}"/></linearGradient>
    <radialGradient id="${id}-face" cx=".32" cy=".24" r=".82"><stop stop-color="${shades[0]}"/><stop offset=".5" stop-color="${shades[1]}"/><stop offset="1" stop-color="${shades[2]}"/></radialGradient>
  </defs><path d="M11 2 27 2 38 29 24 36Z" fill="url(#${id}-blue)" stroke="#b5c7ef" stroke-opacity=".45"/><path d="M37 2 53 2 40 36 26 29Z" fill="url(#${id}-ribbon)" stroke="#ffacb4" stroke-opacity=".4"/><path d="m16 3 11 28m20-28-11 28" stroke="#fff" stroke-opacity=".3" stroke-width="2"/>
  <ellipse cx="32" cy="50" rx="27" ry="25" fill="${shades[3]}"/><circle cx="32" cy="47" r="26" fill="url(#${id}-metal)" stroke="${shades[0]}" stroke-width=".6"/><circle cx="32" cy="47" r="21" fill="url(#${id}-face)" stroke="${shades[3]}" stroke-opacity=".4"/><circle cx="32" cy="47" r="23.5" fill="none" stroke="${shades[3]}" stroke-width="1.8" stroke-dasharray=".6 1.4"/><circle cx="32" cy="47" r="22.5" fill="none" stroke="${shades[0]}" stroke-width=".6"/><circle cx="32" cy="47" r="19.5" fill="none" stroke="${shades[0]}" stroke-opacity=".65" stroke-width=".7"/>
  <path d="m25 35-2-6 5 3 4-6 4 6 5-3-2 6Z" fill="url(#${id}-metal)" stroke="${shades[3]}" stroke-width=".5"/><path d="M22 61q10 6 20 0" fill="none" stroke="${shades[3]}" stroke-width=".8"/>
  <path d="M17 56q-8-10 0-20m30 20q8-10 0-20M14 39l4 2m-5 3 4 2m-4 3 4 2m0 4 3-2m30-14-4 2m5 3-4 2m4 3-4 2m0 4-3-2" fill="none" stroke="${shades[3]}" stroke-opacity=".32" stroke-width="1.4" stroke-linecap="round"/>
  <path d="M13 33q12-14 32-5" fill="none" stroke="#fff" stroke-opacity=".75" stroke-width="2" stroke-linecap="round"/><path d="m48 27 1-4 1 4 4 1-4 1-1 4-1-4-4-1Z" fill="#fff" opacity=".9"/></svg><b>${position}</b></span>`;
}
