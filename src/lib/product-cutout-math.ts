/** U²-Net preprocessing and alpha validation, independent of browser/worker. */
export function normalizedRgb(rgba: Uint8ClampedArray): Float32Array {
  const count = rgba.length / 4;
  let max = 1;
  for (let i = 0; i < rgba.length; i += 4) max = Math.max(max, rgba[i], rgba[i + 1], rgba[i + 2]);
  const result = new Float32Array(count * 3);
  const mean = [0.485, 0.456, 0.406], std = [0.229, 0.224, 0.225];
  for (let i = 0; i < count; i++) for (let c = 0; c < 3; c++) {
    result[c * count + i] = (rgba[i * 4 + c] / max - mean[c]) / std[c];
  }
  return result;
}

export function validatedAlpha(values: Float32Array, side = 320): Uint8ClampedArray {
  if (values.length !== side * side) throw new Error('Recorte inválido.');
  let min = Infinity, max = -Infinity;
  for (const value of values) {
    if (!Number.isFinite(value)) throw new Error('Recorte inválido.');
    min = Math.min(min, value); max = Math.max(max, value);
  }
  if (max - min < 0.001) throw new Error('Não foi possível identificar o produto.');
  const alpha = new Uint8ClampedArray(values.length);
  let kept = 0, clearBorder = 0, borderCount = 0;
  for (let i = 0; i < values.length; i++) {
    alpha[i] = Math.round((values[i] - min) / (max - min) * 255);
    if (alpha[i] > 127) kept++;
    const x = i % side, y = Math.floor(i / side);
    if (x === 0 || y === 0 || x === side - 1 || y === side - 1) {
      borderCount++; if (alpha[i] < 64) clearBorder++;
    }
  }
  if (kept < values.length * 0.005 || kept > values.length * 0.95 || clearBorder < borderCount * 0.3) {
    throw new Error('Recorte incerto. Use a original ou tente outra foto.');
  }
  return alpha;
}
