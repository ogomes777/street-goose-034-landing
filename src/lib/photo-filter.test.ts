import { describe, expect, it } from 'vitest';
import { applyPhotoFilter } from './photo-filter';
describe('mobile photo filters', () => {
  it('saves noir as grayscale and preserves the alpha channel', () => {
    const pixels = new Uint8ClampedArray([220, 60, 20, 123, 30, 180, 80, 255]);
    applyPhotoFilter(pixels, 'grayscale(1) contrast(1.12) brightness(1.03)');
    expect(pixels[0]).toBe(pixels[1]); expect(pixels[1]).toBe(pixels[2]);
    expect(pixels[4]).toBe(pixels[5]); expect(pixels[5]).toBe(pixels[6]);
    expect(pixels[3]).toBe(123); expect(pixels[7]).toBe(255);
  });
  it('retains the original when no filter is selected', () => {
    const pixels = new Uint8ClampedArray([1, 50, 255, 240]);
    applyPhotoFilter(pixels, ''); expect([...pixels]).toEqual([1, 50, 255, 240]);
  });
  it('applies warm and cool effects distinctly without altering opacity', () => {
    const warm = new Uint8ClampedArray([80, 100, 140, 255]);
    const cool = new Uint8ClampedArray(warm);
    applyPhotoFilter(warm, 'sepia(.28) saturate(1.2) contrast(1.05) brightness(1.03)');
    applyPhotoFilter(cool, 'hue-rotate(-10deg) saturate(.85) brightness(1.06) contrast(1.06)');
    expect([...warm]).not.toEqual([...cool]); expect(warm[3]).toBe(255); expect(cool[3]).toBe(255);
    expect(warm[0]).toBeGreaterThan(cool[0]);
  });
});
