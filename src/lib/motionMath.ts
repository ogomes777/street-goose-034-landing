export const clamp = (value: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, value));

export const lerp = (start: number, end: number, amount: number): number =>
  start + (end - start) * amount;

export const damp = (current: number, target: number, lambda: number, deltaSeconds: number): number => {
  const safeDelta = clamp(deltaSeconds, 0, 0.05);
  return lerp(current, target, 1 - Math.exp(-lambda * safeDelta));
};

export const smoothstep = (edge0: number, edge1: number, value: number): number => {
  if (edge0 === edge1) return value < edge0 ? 0 : 1;
  const normalized = clamp((value - edge0) / (edge1 - edge0), 0, 1);
  return normalized * normalized * (3 - 2 * normalized);
};

export const normalizePointer = (
  clientX: number,
  clientY: number,
  viewportWidth: number,
  viewportHeight: number,
): { x: number; y: number } => ({
  x: clamp((clientX / Math.max(viewportWidth, 1)) * 2 - 1, -1, 1),
  y: clamp((clientY / Math.max(viewportHeight, 1)) * 2 - 1, -1, 1),
});

export const getScrollProgress = (scrollY: number, sectionStart: number, travel: number): number =>
  clamp((scrollY - sectionStart) / Math.max(travel, 1), 0, 1);
