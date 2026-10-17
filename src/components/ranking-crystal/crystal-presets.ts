import { LEVEL_GEMS } from "../../../js/level-gems.js";
import type { Advanced } from "./crystal-shader";

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

/** One preset per existing XP tier, in the order of LEVEL_GEMS (level 1 = index 0). */
export const TIER_CRYSTAL_PRESETS: readonly Readonly<CrystalPreset>[] = Object.freeze(
  LEVEL_GEMS.map((gem) =>
    Object.freeze({ ...ORIGINKIT_REFERENCE_PRESET, ...CARD_MOTION, baseColor: tintToReference(gem.color) }),
  ),
);

export function tierCrystalPreset(level: number): Readonly<CrystalPreset> {
  const i = Math.max(0, Math.min(TIER_CRYSTAL_PRESETS.length - 1, (Math.round(Number(level)) || 1) - 1));
  return TIER_CRYSTAL_PRESETS[i];
}
