/* Street Goose 034 — lossless shape, real alpha, deterministic build asset.
   Original graffiti stays untouched. Derived WebP is generated before
   Vite dev/build so NO corrupt uploaded binary is ever necessary. */
import sharp from "sharp";
import { mkdir, stat } from "node:fs/promises";
import { dirname, resolve } from "node:path";

const input = resolve("public/brand/sg034-idvisual-graffiti.png");
const output = resolve("public/brand/sg034-idvisual-cutout.webp");
const { data, info } = await sharp(input).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
const { width, height, channels } = info;
if (channels !== 4 || width < 500 || height < 200) {
  throw new Error("Grafite original em formato inesperado");
}
const count = width * height;
const primary = new Uint8Array(count);
const pixels = Buffer.allocUnsafe(count * 4);

function alphaFor(brightness) {
  if (brightness <= 8) return 0;
  if (brightness >= 51) return 255;
  return Math.round(255 * Math.pow((brightness - 8) / 43, 1.28));
}

for (let i = 0; i < count; i++) {
  const src = i * 4;
  primary[i] = alphaFor(Math.max(data[src], data[src + 1], data[src + 2]));
}
for (let y = 0; y < height; y++) {
  for (let x = 0; x < width; x++) {
    const i = y * width + x;
    const src = i * 4;
    const neighbor = Math.max(
      primary[i],
      x > 0 ? primary[i - 1] : 0,
      x < width - 1 ? primary[i + 1] : 0,
      y > 0 ? primary[i - width] : 0,
      y < height - 1 ? primary[i + width] : 0,
    );
    pixels[src] = data[src];
    pixels[src + 1] = data[src + 1];
    pixels[src + 2] = data[src + 2];
    pixels[src + 3] = Math.max(primary[i], Math.round(neighbor * .2));
  }
}
await mkdir(dirname(output), { recursive: true });
await sharp(pixels, { raw: { width, height, channels: 4 } })
  .webp({ quality: 82, alphaQuality: 88, effort: 6 })
  .toFile(output);
const bytes = (await stat(output)).size;
console.log("SG034 matte-free graffiti:", width + "x" + height, bytes + " bytes");
