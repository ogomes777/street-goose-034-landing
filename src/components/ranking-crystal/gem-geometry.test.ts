import { describe, expect, it } from "vitest";
import { ADVANCED_DEFAULTS, MAX_PLANES } from "./crystal-shader";
import { buildGem } from "./gem-geometry";
import { TIER_CRYSTAL_PRESETS } from "./crystal-presets";

describe("tier gem geometry", () => {
  it("keeps level 1 as the untouched Originkit crystal", () => {
    expect(TIER_CRYSTAL_PRESETS[0].geometry).toBeUndefined();
    expect(TIER_CRYSTAL_PRESETS[0].absorb).toBeUndefined();
  });

  TIER_CRYSTAL_PRESETS.forEach((preset, i) => {
    it(`builds a closed convex solid for level ${i + 1}`, () => {
      const gem = buildGem(preset.geometry, { ...ADVANCED_DEFAULTS, ...preset.advanced }, preset.facets);
      expect(gem.parts.length).toBeGreaterThan(0);
      expect(gem.top).toBeGreaterThan(gem.bottom);
      for (const part of gem.parts) {
        expect(part.count).toBeGreaterThan(6);
        expect(part.count).toBeLessThanOrEqual(MAX_PLANES);
        // Unit normals, and a point on the stone's axis is inside every half-space.
        const inner = [0, (gem.top + gem.bottom) / 2 - part.offset[1], 0];
        for (let k = 0; k < part.count; k++) {
          const [x, y, z, d] = part.planes.slice(k * 4, k * 4 + 4);
          expect(Math.hypot(x, y, z)).toBeCloseTo(1, 5);
          if (gem.parts.length === 1) expect(x * inner[0] + y * inner[1] + z * inner[2]).toBeLessThan(d);
        }
      }
    });
  });
});
