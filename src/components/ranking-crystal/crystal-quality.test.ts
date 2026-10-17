import { describe, expect, it } from "vitest";
import { QualityGovernor } from "./crystal-quality";
import { TIER_CRYSTAL_PRESETS, ORIGINKIT_REFERENCE_PRESET, tierCrystalPreset, tintToReference } from "./crystal-presets";
import { LEVEL_GEMS } from "../../../js/level-gems.js";

const feed = (g: QualityGovernor, ms: number, frames: number) => {
  let changes = 0;
  for (let i = 0; i < frames; i++) if (g.sample(ms)) changes++;
  return changes;
};

describe("QualityGovernor", () => {
  it("does not react to a short spike", () => {
    const g = new QualityGovernor();
    feed(g, 16, 60);
    feed(g, 40, 10);
    expect(g.level).toBe(0);
  });

  it("steps down once under sustained load, then waits the cooldown", () => {
    const g = new QualityGovernor({ downFrames: 30, cooldownFrames: 60 });
    expect(feed(g, 40, 70)).toBe(1);
    expect(g.level).toBe(1);
  });

  it("recovers slowly and only one step at a time", () => {
    const g = new QualityGovernor({ startLevel: 3, upFrames: 300, cooldownFrames: 90 });
    expect(feed(g, 10, 299)).toBe(0);
    expect(feed(g, 10, 2)).toBe(1);
    expect(g.level).toBe(2);
  });

  it("ignores pauses (huge gaps) and never leaves its level range", () => {
    const g = new QualityGovernor({ startLevel: 0 });
    expect(feed(g, 5000, 500)).toBe(0);
    feed(g, 10, 2000);
    expect(g.level).toBe(0);
    const low = new QualityGovernor({ startLevel: 3, downFrames: 5, cooldownFrames: 0 });
    feed(low, 60, 200);
    expect(low.level).toBe(3);
  });
});

describe("tier crystal presets", () => {
  it("keeps one preset per existing tier and the original preset untouched", () => {
    expect(TIER_CRYSTAL_PRESETS).toHaveLength(LEVEL_GEMS.length);
    expect(ORIGINKIT_REFERENCE_PRESET.baseColor).toBe("#6C64BF");
    expect(new Set(TIER_CRYSTAL_PRESETS.map((p) => p.baseColor)).size).toBe(LEVEL_GEMS.length);
    expect(tintToReference("#6C64BF").toLowerCase()).toBe("#6c64bf");
  });

  it("clamps out-of-range levels to the first/last tier", () => {
    expect(tierCrystalPreset(0)).toBe(TIER_CRYSTAL_PRESETS[0]);
    expect(tierCrystalPreset(99)).toBe(TIER_CRYSTAL_PRESETS[TIER_CRYSTAL_PRESETS.length - 1]);
  });
});
