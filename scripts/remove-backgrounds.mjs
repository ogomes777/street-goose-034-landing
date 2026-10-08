/* Street Goose 034 — remoção segura de fundo dos produtos.
   Não usa modelo de ML nenhum: decodifica cada imagem para pixels crus (sharp/
   libvips), detecta se o fundo é uniforme e conectado à borda, e remove só
   essa região por flood-fill a partir das bordas — nunca um threshold global
   de "todo pixel claro vira transparente", que apagaria cromado/reflexo/branco
   interno do produto. Baixa confiança nunca sobrescreve o original: fica
   marcado needs_manual_mask e o catálogo continua usando o arquivo bruto. */
import sharp from "sharp";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const ASSETS = path.join(ROOT, "assets");
const OUT_ROOT = path.join(ASSETS, "products-processed");
const FOLDERS = ["products-lupas", "products-moletons", "products-outros", "products-perfumes", "products-relogios"];

const BG_COLOR_TOLERANCE = 26; // distância euclidiana RGB máx. pra considerar "é o fundo"
const FEATHER_PX = 1.4; // blur aplicado só na máscara binária, não na imagem — sem halo
const ERODE_PX = 1; // encolhe a máscara de "manter" ~1px antes do feather — come a faixa de
                     // pixel de borda que a foto original já mistura com o fundo (anti-
                     // aliasing da própria câmera/render), que sobrevivia ao threshold de cor

function pixelAt(raw, width, x, y) {
  const i = (y * width + x) * 4;
  return { r: raw[i], g: raw[i + 1], b: raw[i + 2], a: raw[i + 3] };
}
function colorDist(r1, g1, b1, r2, g2, b2) {
  const dr = r1 - r2, dg = g1 - g2, db = b1 - b2;
  return Math.sqrt(dr * dr + dg * dg + db * db);
}
function averageColor(samples) {
  let r = 0, g = 0, b = 0;
  samples.forEach((p) => { r += p.r; g += p.g; b += p.b; });
  return { r: r / samples.length, g: g / samples.length, b: b / samples.length };
}
function colorVariance(samples, avg) {
  let s = 0;
  samples.forEach((p) => { s += colorDist(p.r, p.g, p.b, avg.r, avg.g, avg.b) ** 2; });
  return s / samples.length;
}

// blur manual do canal único (não usar sharp aqui: o round-trip raw de 1
// canal via sharp() expande silenciosamente pra 3 canais e desalinha o
// buffer de saída — descoberto testando isoladamente, ver histórico)
function boxBlur1D(src, w, h, horizontal, radius) {
  var out = new Uint8ClampedArray(src.length);
  var win = radius * 2 + 1;
  if (horizontal) {
    for (var y = 0; y < h; y++) {
      var rowStart = y * w, sum = 0;
      for (var x = -radius; x <= radius; x++) sum += src[rowStart + Math.min(w - 1, Math.max(0, x))];
      for (var x2 = 0; x2 < w; x2++) {
        out[rowStart + x2] = sum / win;
        var addX = Math.min(w - 1, x2 + radius + 1), remX = Math.max(0, x2 - radius);
        sum += src[rowStart + addX] - src[rowStart + remX];
      }
    }
  } else {
    for (var x3 = 0; x3 < w; x3++) {
      var sum2 = 0;
      for (var y2 = -radius; y2 <= radius; y2++) sum2 += src[Math.min(h - 1, Math.max(0, y2)) * w + x3];
      for (var y3 = 0; y3 < h; y3++) {
        out[y3 * w + x3] = sum2 / win;
        var addY = Math.min(h - 1, y3 + radius + 1), remY = Math.max(0, y3 - radius);
        sum2 += src[addY * w + x3] - src[remY * w + x3];
      }
    }
  }
  return out;
}
function featherMask(maskKeep255, w, h, radiusPx) {
  var radius = Math.max(1, Math.round(radiusPx));
  var h1 = boxBlur1D(maskKeep255, w, h, true, radius);
  var v1 = boxBlur1D(h1, w, h, false, radius);
  return v1;
}
// erosão = mínimo da vizinhança — encolhe a região "manter" pra dentro,
// comendo a faixa de borda que ainda carrega mistura com o fundo original
function erodeMask(maskKeep255, w, h, radius) {
  if (radius <= 0) return maskKeep255;
  var out = new Uint8ClampedArray(maskKeep255.length);
  for (var y = 0; y < h; y++) {
    for (var x = 0; x < w; x++) {
      var minV = 255;
      for (var dy = -radius; dy <= radius; dy++) {
        var ny = y + dy; if (ny < 0) ny = 0; else if (ny >= h) ny = h - 1;
        var rowBase = ny * w;
        for (var dx = -radius; dx <= radius; dx++) {
          var nx = x + dx; if (nx < 0) nx = 0; else if (nx >= w) nx = w - 1;
          var v = maskKeep255[rowBase + nx];
          if (v < minV) minV = v;
        }
      }
      out[y * w + x] = minV;
    }
  }
  return out;
}
// descontamina a cor dos pixels de borda semitransparente: um pixel com
// alpha parcial ainda carrega parte da cor do fundo original (é assim que a
// própria imagem foi fotografada/renderizada) — sem remover essa mistura,
// composto sobre um palco escuro sobra uma franja clara nas bordas mesmo com
// alpha baixo. Fórmula padrão de "unpremultiply": observed = F*a + B*(1-a).
function decontaminate(observed, bgChannel, alpha01) {
  if (alpha01 <= 0.02) return observed;
  var f = (observed - bgChannel * (1 - alpha01)) / alpha01;
  return Math.max(0, Math.min(255, Math.round(f)));
}

async function processImage(absPath, relPath) {
  const base = sharp(absPath).ensureAlpha();
  const meta = await base.metadata();
  const { width, height } = meta;
  const raw = await base.raw().toBuffer();

  let hasRealAlpha = false;
  for (let i = 3; i < raw.length; i += 4 * 23) {
    if (raw[i] < 250) { hasRealAlpha = true; break; }
  }
  if (hasRealAlpha) {
    return { relPath, width, height, alpha: true, bgType: "transparente", confidence: 1, status: "approved", processedPath: null, note: "já tem canal alpha real — mantido como está, sem reprocessar" };
  }

  const step = Math.max(1, Math.round(Math.min(width, height) / 220));
  const borderSamples = [];
  for (let x = 0; x < width; x += step) { borderSamples.push(pixelAt(raw, width, x, 0)); borderSamples.push(pixelAt(raw, width, x, height - 1)); }
  for (let y = 0; y < height; y += step) { borderSamples.push(pixelAt(raw, width, 0, y)); borderSamples.push(pixelAt(raw, width, width - 1, y)); }
  const avg = averageColor(borderSamples);
  const variance = colorVariance(borderSamples, avg);
  const isUniform = variance < 900;
  const brightness = (avg.r + avg.g + avg.b) / 3;

  let bgType;
  if (!isUniform) bgType = "fotografico_complexo";
  else if (brightness > 195) bgType = "branco_offwhite";
  else if (brightness < 60) bgType = "preto";
  else bgType = "fotografico_complexo";

  if (bgType === "fotografico_complexo") {
    return { relPath, width, height, alpha: false, bgType, confidence: 0.2, status: "needs_manual_mask", processedPath: null, note: "fundo não uniforme (foto real) — remoção automática por flood-fill não é segura aqui" };
  }

  const mask = new Uint8Array(width * height);
  const visited = new Uint8Array(width * height);
  const stack = [];
  function tryPush(x, y) {
    if (x < 0 || y < 0 || x >= width || y >= height) return;
    const idx = y * width + x;
    if (visited[idx]) return;
    visited[idx] = 1;
    const p = pixelAt(raw, width, x, y);
    if (colorDist(p.r, p.g, p.b, avg.r, avg.g, avg.b) <= BG_COLOR_TOLERANCE) { mask[idx] = 1; stack.push(idx); }
  }
  for (let x = 0; x < width; x++) { tryPush(x, 0); tryPush(x, height - 1); }
  for (let y = 0; y < height; y++) { tryPush(0, y); tryPush(width - 1, y); }
  while (stack.length) {
    const idx = stack.pop();
    const x = idx % width, y = (idx - x) / width;
    tryPush(x + 1, y); tryPush(x - 1, y); tryPush(x, y + 1); tryPush(x, y - 1);
  }

  const bgPixelCount = mask.reduce((a, b) => a + b, 0);
  const bgFraction = bgPixelCount / (width * height);
  let confidence = 1;
  if (bgFraction < 0.05 || bgFraction > 0.92) confidence *= 0.35;
  if (variance > 400) confidence *= 0.7;
  confidence = Number(confidence.toFixed(2));
  const status = confidence >= 0.55 ? "approved" : "needs_manual_mask";

  if (status !== "approved") {
    return { relPath, width, height, alpha: false, bgType, confidence, status, processedPath: null, note: "confiança baixa (fundo detectado em " + (bgFraction * 100).toFixed(1) + "% da imagem) — não publiquei recorte automático" };
  }

  const maskBuf = new Uint8ClampedArray(width * height);
  for (let i = 0; i < mask.length; i++) maskBuf[i] = mask[i] ? 0 : 255;
  const erodedMask = erodeMask(maskBuf, width, height, ERODE_PX);
  const blurredMask = featherMask(erodedMask, width, height, FEATHER_PX);

  const outRaw = Buffer.from(raw);
  for (let i = 0, px = 0; i < outRaw.length; i += 4, px++) {
    const alpha01 = blurredMask[px] / 255;
    if (alpha01 > 0.02 && alpha01 < 0.98) {
      outRaw[i] = decontaminate(raw[i], avg.r, alpha01);
      outRaw[i + 1] = decontaminate(raw[i + 1], avg.g, alpha01);
      outRaw[i + 2] = decontaminate(raw[i + 2], avg.b, alpha01);
    }
    outRaw[i + 3] = Math.round(raw[i + 3] * alpha01);
  }

  const outRelDir = path.dirname(relPath);
  const outDir = path.join(OUT_ROOT, outRelDir);
  await fs.mkdir(outDir, { recursive: true });
  const outName = path.basename(relPath).replace(/\.[^.]+$/, "") + ".png";
  const outPath = path.join(outDir, outName);
  await sharp(outRaw, { raw: { width, height, channels: 4 } }).png({ compressionLevel: 9 }).toFile(outPath);

  return { relPath, width, height, alpha: false, bgType, confidence, status: "approved", processedPath: path.relative(ASSETS, outPath).replace(/\\/g, "/"), note: "fundo removido por flood-fill a partir da borda (tolerância " + BG_COLOR_TOLERANCE + ", feather " + FEATHER_PX + "px)" };
}

async function main() {
  const results = [];
  for (const folder of FOLDERS) {
    const dir = path.join(ASSETS, folder);
    let files;
    try { files = await fs.readdir(dir); } catch { continue; }
    for (const file of files.sort()) {
      if (!/\.(png|jpe?g|webp)$/i.test(file)) continue;
      const abs = path.join(dir, file);
      const rel = path.join(folder, file);
      try {
        const r = await processImage(abs, rel);
        results.push(r);
        console.log(r.status.padEnd(18), String(r.bgType).padEnd(20), rel);
      } catch (e) {
        results.push({ relPath: rel, status: "error", note: String((e && e.message) || e) });
        console.log("error             ", rel, "-", (e && e.message) || e);
      }
    }
  }
  await fs.mkdir(OUT_ROOT, { recursive: true });
  await fs.writeFile(path.join(OUT_ROOT, "manifest.json"), JSON.stringify(results, null, 2));

  const approved = results.filter((r) => r.status === "approved" && r.processedPath);
  const alreadyAlpha = results.filter((r) => r.bgType === "transparente");
  const needsManual = results.filter((r) => r.status === "needs_manual_mask");
  const errors = results.filter((r) => r.status === "error");
  console.log("\n=== RESUMO ===");
  console.log("total:", results.length, "| processados agora:", approved.length, "| já tinham alpha:", alreadyAlpha.length, "| precisam revisão manual:", needsManual.length, "| erros:", errors.length);
}

main();
