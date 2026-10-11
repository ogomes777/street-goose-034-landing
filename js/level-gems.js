/* Consistent visual identity for each real XP level; thresholds remain server data. */
export const LEVEL_GEMS = [
  { name: 'Quartzo', color: '#a9d4df', sides: 6 },
  { name: 'Esmeralda', color: '#64e6b2', sides: 4 },
  { name: 'Safira', color: '#75abff', sides: 8 },
  { name: 'Ametista', color: '#c79aff', sides: 5 },
  { name: 'Topázio', color: '#f3cf77', sides: 6 },
  { name: 'Rubi', color: '#ff819e', sides: 3 },
  { name: 'Diamante', color: '#e9e8ff', sides: 8 },
];
export function levelGem(level) {
  return LEVEL_GEMS[Math.max(0, Math.min(LEVEL_GEMS.length - 1, (Number(level) || 1) - 1))];
}
export function gemHtml(level) {
  const gem = levelGem(level);
  const points = Array.from({ length: gem.sides }, (_, i) => {
    const a = i * Math.PI * 2 / gem.sides - Math.PI / 2;
    return [32 + Math.cos(a) * 25, 32 + Math.sin(a) * 27];
  });
  return '<span class="sg-level-gem" style="--gem-color:' + gem.color + '" role="img" aria-label="' + gem.name + ', nível ' + (Number(level) || 1) + '"><svg viewBox="0 0 64 64" aria-hidden="true">' +
    points.map((p, i) => '<polygon points="32,32 ' + p.join(',') + ' ' + points[(i + 1) % points.length].join(',') + '" fill="currentColor" opacity="' + (.3 + (i % 4) * .18) + '"/>').join('') +
    '<polygon points="' + points.map(p => p.join(',')).join(' ') + '" fill="none" stroke="currentColor" stroke-width="1"/><path d="M24 23 32 16 40 24 32 35Z" fill="#fff" opacity=".45"/></svg></span>';
}
export function medalHtml(position) {
  if (position > 3) return '<span class="ranking-number">' + String(position).padStart(2, '0') + '</span>';
  const name = ['ouro', 'prata', 'bronze'][position - 1];
  return '<span class="ranking-medal ranking-medal--' + position + '" role="img" aria-label="' + position + 'º lugar, medalha de ' + name + '"><svg viewBox="0 0 48 56" aria-hidden="true"><path d="m9 2 10 0 5 16-9 5Z" fill="#79709c"/><path d="m29 2 10 0-6 21-9-5Z" fill="#473b68"/><circle cx="24" cy="33" r="19" fill="currentColor"/><circle cx="24" cy="33" r="15" fill="none" stroke="#fff" stroke-opacity=".45"/><path d="m12 33 2-2m20 2 2-2" stroke="#17111f" stroke-opacity=".3"/></svg><b>' + position + '</b></span>';
}
