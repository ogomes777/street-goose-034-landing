import { describe, it, expect } from 'vitest';
import { normalizedRgb, validatedAlpha } from './product-cutout-math';
describe('product cutout safety', () => {
  it('normalizes RGB independently of alpha and uses NCHW channel order', () => {
    const data = normalizedRgb(new Uint8ClampedArray([255, 0, 128, 255, 0, 255, 0, 0]));
    expect(data[0]).toBeCloseTo((1 - .485) / .229);
    expect(data[1]).toBeCloseTo(-.485 / .229);
    expect(data[2]).toBeCloseTo(-.456 / .224);
    expect(data[3]).toBeCloseTo((1 - .456) / .224);
    expect([...normalizedRgb(new Uint8ClampedArray([0,0,0,255]))].every(Number.isFinite)).toBe(true);
  });
  it('rejects empty, nonfinite and constant inference results', () => {
    expect(() => validatedAlpha(new Float32Array(100).fill(1), 10)).toThrow();
    expect(() => validatedAlpha(new Float32Array(100).fill(NaN), 10)).toThrow();
    expect(() => validatedAlpha(new Float32Array(5), 10)).toThrow();
  });
  it('keeps soft edge alpha and removes the border for a valid centered product', () => {
    const v = new Float32Array(100);
    for (let y=3;y<7;y++) for(let x=3;x<7;x++) v[y*10+x]=1;
    v[22]=.5;
    const a=validatedAlpha(v,10);
    expect(a[0]).toBe(0); expect(a[44]).toBe(255); expect(a[22]).toBe(128);
  });
  it('rejects masks that would erase the product or retain almost the whole background', () => {
    const empty = new Float32Array(320*320); empty[0]=1;
    expect(() => validatedAlpha(empty)).toThrow();
    const full = new Float32Array(100).fill(1); full[0]=0;
    expect(() => validatedAlpha(full,10)).toThrow();
  });
});
