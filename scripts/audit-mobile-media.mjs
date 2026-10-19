// CI media budget for Street Goose 034, read-only.
import { existsSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";
const root = process.cwd();
const read = (p) => existsSync(join(root, p)) ? statSync(join(root, p)).size : 0;
const original = read("assets/street-goose-theme.mp3");
const optimized = read("assets/street-goose-theme-mobile.mp3");
if (!original || !optimized) throw new Error("Original ou MP3 mobile não encontrado: a entrega mobile não está completa.");
if (optimized >= original || optimized < 100_000) {
  throw new Error("MP3 mobile inválido: deve conter áudio real e ser menor que a faixa original.");
}
if (!existsSync(join(root, "dist/assets/street-goose-theme-mobile.mp3"))) {
  throw new Error("A versão mobile não entrou no dist: seria HTTP 404 na Vercel.");
}
console.log(`Trilha original: ${(original / 1e6).toFixed(2)} MB`);
console.log(`Trilha mobile: ${(optimized / 1e6).toFixed(2)} MB`);
console.log(`Economia real: ${((1 - optimized / original) * 100).toFixed(1)}%`);
const dirs = ["assets/heroes/web", "assets/products/web", "assets"];
let media = [];
for (const dir of dirs) {
  if (!existsSync(join(root, dir))) continue;
  function collect(folder, deep = 0) {
    for (const e of readdirSync(join(root, folder), { withFileTypes: true })) {
      const path = join(folder, e.name);
      if (e.isDirectory() && deep < 2) collect(path, deep + 1);
      if (e.isFile() && /\.(mp4|webm|mp3|jpe?g|png|webp|avif)$/i.test(e.name)) {
        media.push({ name: relative(root, join(root, path)), size: read(path) });
      }
    }
  }
  collect(dir);
}
const seen = new Map(media.map((m) => [m.name, m]));
media = [...seen.values()].sort((a, b) => b.size - a.size);
console.log("Maiores mídias presentes no build/source:");
for (const item of media.slice(0, 12)) console.log(`  ${(item.size / 1e6).toFixed(2)} MB ${item.name}`);
for (const item of media.slice(0, 12)) if (item.name.endsWith(".mp4") && item.size > 8_000_000) {
  console.warn(`Atenção: vídeo pesado a avaliar sem sacrificar qualidade: ${item.name}`);
}
