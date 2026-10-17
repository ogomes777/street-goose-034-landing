import { LEVEL_GEMS } from "../../../js/level-gems.js";
import type { Advanced } from "./crystal-shader";
import type { GemGeometry } from "./gem-geometry";

export interface CrystalPreset {
  speed: number;
  scale: number;
  facets: number;
  dispersion: number;
  light: number;
  baseColor: string;
  hoverStrength: number;
  hoverSpeedBoost: number;
  advanced?: Partial<Advanced>;
  /** Cut to trace; omitted = the Originkit crystal itself. */
  geometry?: GemGeometry;
  /** Beer-Lambert absorption per unit length (r, g, b); omitted = clear. */
  absorb?: [number, number, number];
  /** Fraction of the slot height the stone fills (cuts other than Originkit). */
  fill?: number;
}

/** The exact preset of the supplied Originkit component (baseColor #6C64BF). */
export const ORIGINKIT_REFERENCE_PRESET: Readonly<CrystalPreset> = Object.freeze({
  speed: 50,
  scale: 61,
  facets: 6,
  dispersion: 79,
  light: 92,
  baseColor: "#6C64BF",
  hoverStrength: 30,
  hoverSpeedBoost: 200,
});

const luma = (r: number, g: number, b: number) => 0.299 * r + 0.587 * g + 0.114 * b;

/** Keeps a tier's hue but matches the reference light's luminance, so a pale
    stone colour (Quartzo, Diamante) is not blown out at light 92. */
export function tintToReference(hex: string, referenceHex = ORIGINKIT_REFERENCE_PRESET.baseColor): string {
  const parse = (h: string) => {
    const n = parseInt(h.replace("#", "").slice(0, 6), 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255] as const;
  };
  const [r, g, b] = parse(hex);
  const target = luma(...parse(referenceHex));
  const k = target / Math.max(luma(r, g, b), 1);
  const ch = (v: number) => Math.round(Math.min(255, v * k)).toString(16).padStart(2, "0");
  return "#" + ch(r) + ch(g) + ch(b);
}

/* Card adaptation: same solid, optics and light rig as the reference. Only
   the motion is calmer (speed 34 ≈ one turn every 10.6 s instead of 7.2 s,
   hover boost 40 % instead of 200 %) so the profile stays the thing you read. */
const CARD_MOTION = { speed: 34, hoverStrength: 18, hoverSpeedBoost: 40 } as const;

/* Brilliant-style profile shared by the round, oval, pear and trillion cuts:
   pavilion mains + lower girdle, girdle, upper girdle, bezel, star, table. */
const BRILLIANT_RINGS: [number, number][] = [
  [-0.86, 0], [-0.2, 0.77], [0, 1], [0.04, 1], [0.15, 0.88], [0.28, 0.69], [0.33, 0.57],
];
const BRILLIANT_BANDS = [
  { n: 8, phase: 0 }, { n: 16, phase: 0.5 }, { n: 16, phase: 0 },
  { n: 16, phase: 0.5 }, { n: 8, phase: 0.5 }, { n: 8, phase: 0 },
];

/* Optics per tier. IOR follows the real mineral (quartz/amethyst 1.54,
   emerald 1.58, topaz 1.62, ruby/sapphire 1.77, diamond 2.42); body colour
   comes from absorption, the light stays close to white like a studio. */
const TIER_OPTICS: Partial<CrystalPreset>[] = [
  // 1 · Quartzo — the home crystal, untouched (Originkit solid, tinted light).
  {},
  // 2 · Esmeralda — step cut, edges parallel to the octagon.
  {
    geometry: {
      kind: "faceted",
      footprint: { type: "poly", pts: [[-0.72, -0.4], [-0.48, -0.64], [0.48, -0.64], [0.72, -0.4], [0.72, 0.4], [0.48, 0.64], [-0.48, 0.64], [-0.72, 0.4]] },
      rings: [[-0.74, 0.22], [-0.5, 0.55], [-0.28, 0.82], [-0.12, 1], [0.08, 1], [0.24, 0.9], [0.38, 0.78], [0.5, 0.66]],
      bands: Array.from({ length: 7 }, () => ({ edges: true })),
    },
    absorb: [1.5, 0.16, 0.95], baseColor: "#CDEFDC", light: 100, dispersion: 60, fill: 0.72,
    advanced: { ior: 158, tilt: 18, bounces: 4 },
  },
  // 3 · Safira — oval brilliant.
  {
    geometry: { kind: "faceted", footprint: { type: "ellipse", a: 0.78, b: 0.53 }, rings: BRILLIANT_RINGS, bands: BRILLIANT_BANDS },
    absorb: [1.7, 0.95, 0.1], baseColor: "#D8E3FF", light: 100, dispersion: 70, fill: 0.72,
    advanced: { ior: 177, tilt: 18, bounces: 4 },
  },
  // 4 · Ametista — cluster of three crystal points.
  {
    geometry: {
      kind: "cluster",
      parts: [
        { crystal: { bodyWidth: 62, bodyLength: 150, crownTilt: 58, seed: 11 }, facets: 6, scale: 1, offset: [0, 0, 0], lean: [0, 0] },
        { crystal: { bodyWidth: 60, bodyLength: 120, crownTilt: 58, seed: 23 }, facets: 6, scale: 0.68, offset: [-0.78, -0.55, -0.3], lean: [24, -6] },
        { crystal: { bodyWidth: 58, bodyLength: 110, crownTilt: 60, seed: 31 }, facets: 6, scale: 0.58, offset: [0.72, -0.7, 0.18], lean: [-27, 8] },
      ],
    },
    absorb: [0.5, 1.35, 0.25], baseColor: "#F0E6FC", dispersion: 75, fill: 0.74,
    advanced: { ior: 154, tilt: 10, bounces: 3 },
  },
  // 5 · Topázio — pear brilliant, tip forward.
  {
    geometry: {
      kind: "faceted",
      footprint: { type: "poly", pts: [[0, -0.9], [0.5, -0.32], [0.64, 0.25], [0.38, 0.65], [0, 0.78], [-0.38, 0.65], [-0.64, 0.25], [-0.5, -0.32]], round: 0.02 },
      rings: BRILLIANT_RINGS, bands: BRILLIANT_BANDS,
    },
    absorb: [0.06, 0.32, 1.35], baseColor: "#FFF1D6", light: 100, dispersion: 75, fill: 0.72,
    advanced: { ior: 162, tilt: 20, bounces: 4 },
  },
  // 6 · Rubi — trillion with softened corners, brilliant crown.
  {
    geometry: {
      kind: "faceted",
      footprint: { type: "poly", pts: [[0, -0.78], [0.7, 0.4], [-0.7, 0.4]], round: 0.12 },
      rings: BRILLIANT_RINGS,
      bands: [{ n: 9, phase: 0 }, { n: 18, phase: 0.5 }, { n: 18, phase: 0 }, { n: 18, phase: 0.5 }, { n: 9, phase: 0.5 }, { n: 9, phase: 0 }],
    },
    absorb: [0.08, 1.6, 1.0], baseColor: "#FFDCE3", light: 100, dispersion: 70, fill: 0.72,
    advanced: { ior: 177, tilt: 20, bounces: 4 },
  },
  // 7 · Diamante — round brilliant, diamond IOR and fire.
  {
    geometry: { kind: "faceted", footprint: { type: "circle", r: 1 }, rings: BRILLIANT_RINGS, bands: BRILLIANT_BANDS },
    absorb: [0, 0, 0], baseColor: "#EEF0FA", dispersion: 100, fill: 0.72,
    advanced: { ior: 242, tilt: 20, bounces: 5, residual: 22 },
  },
];

/** One preset per existing XP tier, in the order of LEVEL_GEMS (level 1 = index 0). */
export const TIER_CRYSTAL_PRESETS: readonly Readonly<CrystalPreset>[] = Object.freeze(
  LEVEL_GEMS.map((gem, i) =>
    Object.freeze({
      ...ORIGINKIT_REFERENCE_PRESET,
      ...CARD_MOTION,
      baseColor: tintToReference(gem.color),
      ...TIER_OPTICS[i],
    }),
  ),
);

export function tierCrystalPreset(level: number): Readonly<CrystalPreset> {
  const i = Math.max(0, Math.min(TIER_CRYSTAL_PRESETS.length - 1, (Math.round(Number(level)) || 1) - 1));
  return TIER_CRYSTAL_PRESETS[i];
}
