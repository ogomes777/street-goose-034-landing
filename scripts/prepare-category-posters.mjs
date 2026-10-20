// Build-only: generate efficient 1280px WebP posters from exact approved JPG frames.
// Kept separate from the source assets; no change to the film or its framing.
import sharp from "sharp";
import { mkdir, stat } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = fileURLToPath(new URL("../", import.meta.url));
const dest = path.join(root, "assets/heroes/posters-web");
await mkdir(dest, { recursive: true });
for (const slug of ["lupas", "acessorios", "relogios", "perfumes", "trajes"]) {
  const src = path.join(root, "assets/heroes/loop", `hero-${slug}-poster.jpg`);
  const dst = path.join(dest, `hero-${slug}-poster.webp`);
  await sharp(src)
    .rotate()
    .resize({ width: 1280, withoutEnlargement: true })
    .webp({ quality: 78, effort: 5 })
    .toFile(dst);
  const [a, b] = await Promise.all([stat(src), stat(dst)]);
  if (b.size > a.size) throw new Error(`Poster ${slug} not optimized (${a.size} -> ${b.size})`);
  console.log(`Poster ${slug}: ${(a.size/1024).toFixed(0)}KB -> ${(b.size/1024).toFixed(0)}KB (${((1-b.size/a.size)*100).toFixed(1)}% less)`);
}
