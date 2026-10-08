import { describe, expect, it } from "vitest";
import { clamp, damp, getScrollProgress, normalizePointer, smoothstep } from "./motionMath";

describe("motion math", () => {
  it("normalizes and clamps pointer coordinates", () => {
    expect(normalizePointer(500, 250, 1000, 500)).toEqual({ x: 0, y: 0 });
    expect(normalizePointer(-100, 900, 1000, 500)).toEqual({ x: -1, y: 1 });
  });

  it("keeps scroll progress reversible and bounded", () => {
    expect(getScrollProgress(100, 100, 400)).toBe(0);
    expect(getScrollProgress(300, 100, 400)).toBe(0.5);
    expect(getScrollProgress(500, 100, 400)).toBe(1);
    expect(getScrollProgress(300, 100, 400)).toBe(0.5);
  });

  it("uses frame-rate-independent damping", () => {
    const oneFrame = damp(0, 1, 8, 1 / 60);
    const twoHalfFrames = damp(damp(0, 1, 8, 1 / 120), 1, 8, 1 / 120);
    expect(oneFrame).toBeCloseTo(twoHalfFrames, 6);
    expect(oneFrame).toBeGreaterThan(0);
    expect(oneFrame).toBeLessThan(1);
  });

  it("produces smooth bounded easing", () => {
    expect(smoothstep(0.2, 0.8, 0)).toBe(0);
    expect(smoothstep(0.2, 0.8, 0.5)).toBeCloseTo(0.5);
    expect(smoothstep(0.2, 0.8, 1)).toBe(1);
    expect(clamp(12, -8, 8)).toBe(8);
  });
});
