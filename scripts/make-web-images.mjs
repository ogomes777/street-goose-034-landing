// Street Goose 034 — fotos de produto em WebP para o site (mesmo tamanho,
// mesma cor, transparência sem perda). Um PNG de ~700 KB vira ~60–90 KB.
// Mesma regra do catálogo: versão sem fundo (products-processed) quando
// existe, senão a original. As originais continuam como fonte e fallback
// (js/catalog.js usa a original se a WebP de uma foto ainda não existir).
// Só refaz o que mudou.
//
//   node scripts/make-web-images.mjs
import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1")), "..");
const FOLDERS = ["products-lupas", "products-relogios", "products-perfumes", "products-moletons", "products-outros"];

let made = 0, kept = 0, before = 0, after = 0;
for (const folder of FOLDERS) {
  const srcDir = path.join(ROOT, "assets", folder);
  const outDir = path.join(ROOT, "assets", "web-products", folder);
  fs.mkdirSync(outDir, { recursive: true });
  for (const file of fs.readdirSync(srcDir)) {
    if (!/\.(png|jpe?g|webp)$/i.test(file)) continue;
    const stem = file.replace(/\.[^.]+$/, "");
    const processed = path.join(ROOT, "assets", "products-processed", folder, stem + ".png");
    const src = fs.existsSync(processed) ? processed : path.join(srcDir, file);
    const out = path.join(outDir, stem + ".webp");
    if (fs.existsSync(out) && fs.statSync(out).mtimeMs >= fs.statSync(src).mtimeMs) { kept++; continue; }
    await sharp(src).rotate().webp({ quality: 88, alphaQuality: 100, effort: 6, smartSubsample: true }).toFile(out);
    before += fs.statSync(src).size;
    after += fs.statSync(out).size;
    made++;
  }
}
const mb = (n) => (n / 1048576).toFixed(1) + " MB";
console.log(`web: ${made} gerada(s) (${mb(before)} → ${mb(after)}), ${kept} já em dia`);
