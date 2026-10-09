// Street Goose 034 — miniaturas 160px (WebP) de cada foto de produto, usadas
// onde a foto aparece pequena (seletor "Peça no visual" da comunidade).
// Mesma regra do catálogo: versão sem fundo (products-processed) quando
// existe, senão a original. Só refaz o que mudou.
//
//   node scripts/make-thumbs.mjs            (ffmpeg no PATH)
//   FFMPEG="C:/.../ffmpeg.exe" node scripts/make-thumbs.mjs
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1")), "..");
const FFMPEG = process.env.FFMPEG || "ffmpeg";
const FOLDERS = ["products-lupas", "products-relogios", "products-perfumes", "products-moletons", "products-outros"];
const SIZE = 160;

let made = 0, kept = 0;
for (const folder of FOLDERS) {
  const srcDir = path.join(ROOT, "assets", folder);
  const outDir = path.join(ROOT, "assets", "thumbs", folder);
  fs.mkdirSync(outDir, { recursive: true });
  for (const file of fs.readdirSync(srcDir)) {
    if (!/\.(png|jpe?g|webp)$/i.test(file)) continue;
    const stem = file.replace(/\.[^.]+$/, "");
    const processed = path.join(ROOT, "assets", "products-processed", folder, stem + ".png");
    const src = fs.existsSync(processed) ? processed : path.join(srcDir, file);
    const out = path.join(outDir, stem + ".webp");
    if (fs.existsSync(out) && fs.statSync(out).mtimeMs >= fs.statSync(src).mtimeMs) { kept++; continue; }
    execFileSync(FFMPEG, [
      "-y", "-loglevel", "error", "-i", src,
      "-vf", `scale=${SIZE}:${SIZE}:force_original_aspect_ratio=decrease`,
      "-c:v", "libwebp", "-quality", "80", "-compression_level", "6", out,
    ]);
    made++;
  }
}
console.log(`thumbs: ${made} gerada(s), ${kept} já em dia`);
