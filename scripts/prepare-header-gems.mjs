// PNGs transparentes derivados das mesmas lapidações dos níveis reais.
import sharp from 'sharp';
import { mkdir } from 'node:fs/promises';
import { LEVEL_GEMS } from '../js/level-gems.js';
await mkdir(new URL('../public/brand/level-gems/', import.meta.url), {recursive:true});
for (const [index, gem] of LEVEL_GEMS.entries()) {
  const points=gem.outline.split(' ').map(p=>p.split(',').map(Number));
  const facets=points.map((p,i)=>`<polygon points="32,32 ${p} ${points[(i+1)%points.length]}" fill="url(#facet${i%4})"/>`).join('');
  const gradients=[['#fff',gem.color], [gem.color,'#152333'], [gem.color,'#fff'], ['#101d31',gem.color]].map(([a,b],i)=>`<linearGradient id="facet${i}" x1="0" y1="0" x2="1" y2="1"><stop stop-color="${a}"/><stop offset="1" stop-color="${b}"/></linearGradient>`).join('');
  const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="96" height="112" viewBox="0 0 64 74"><defs>${gradients}</defs><g transform="translate(0 4)">${facets}<polygon points="${gem.outline}" fill="none" stroke="${gem.color}" stroke-width="1"/><path d="M24 23 32 16 40 24 32 35Z" fill="#fff" opacity=".68"/><polyline points="${points.slice(0,3).map(p=>p.join(',')).join(' ')}" fill="none" stroke="#fff" stroke-width="1.15" opacity=".9"/><path d="m43 13 1-4 1 4 4 1-4 1-1 4-1-4-4-1Z" fill="#fff" opacity=".85"/></g></svg>`;
  await sharp(Buffer.from(svg)).png().toFile(new URL(`../public/brand/level-gems/level-${index+1}.png`,import.meta.url).pathname);
}
