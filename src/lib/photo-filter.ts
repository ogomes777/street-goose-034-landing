/** CPU fallback for Safari versions without CanvasRenderingContext2D.filter.
 * Uses the same CSS filter operations as the community preview. */
export function applyPhotoFilter(pixels: Uint8ClampedArray, css: string): void {
  const ops = [...css.matchAll(/(grayscale|sepia|saturate|contrast|brightness|hue-rotate)\(([-.\d]+)(deg)?\)/g)];
  for (let i = 0; i < pixels.length; i += 4) {
    let r = pixels[i] / 255, g = pixels[i + 1] / 255, b = pixels[i + 2] / 255;
    for (const [, op, value] of ops) {
      const n = Number(value);
      let rr = r, gg = g, bb = b;
      if (op === 'brightness') { rr = r * n; gg = g * n; bb = b * n; }
      if (op === 'contrast') { rr = (r - .5) * n + .5; gg = (g - .5) * n + .5; bb = (b - .5) * n + .5; }
      if (op === 'grayscale' || op === 'saturate') {
        const s = op === 'grayscale' ? 1 - Math.min(1, n) : n;
        const y = .2126 * r + .7152 * g + .0722 * b;
        rr = y + s * (r - y); gg = y + s * (g - y); bb = y + s * (b - y);
      }
      if (op === 'sepia') {
        const s = Math.min(1, n);
        rr = r * (1 - s) + s * (.393 * r + .769 * g + .189 * b);
        gg = g * (1 - s) + s * (.349 * r + .686 * g + .168 * b);
        bb = b * (1 - s) + s * (.272 * r + .534 * g + .131 * b);
      }
      if (op === 'hue-rotate') {
        const c = Math.cos(n * Math.PI / 180), s = Math.sin(n * Math.PI / 180);
        rr = (.213 + .787*c - .213*s)*r + (.715 - .715*c - .715*s)*g + (.072 - .072*c + .928*s)*b;
        gg = (.213 - .213*c + .143*s)*r + (.715 + .285*c + .140*s)*g + (.072 - .072*c - .283*s)*b;
        bb = (.213 - .213*c - .787*s)*r + (.715 - .715*c + .715*s)*g + (.072 + .928*c + .072*s)*b;
      }
      r = Math.min(1, Math.max(0, rr)); g = Math.min(1, Math.max(0, gg)); b = Math.min(1, Math.max(0, bb));
    }
    pixels[i] = r * 255; pixels[i + 1] = g * 255; pixels[i + 2] = b * 255;
  }
}
