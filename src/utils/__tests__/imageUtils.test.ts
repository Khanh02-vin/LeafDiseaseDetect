import { describe, expect, it } from '@jest/globals';
import { ensureRgbPixelData } from '../imageUtils';

describe('ensureRgbPixelData', () => {
  it('returns original buffer when already RGB', () => {
    const width = 2;
    const height = 1;
    const rgb = new Uint8Array([10, 20, 30, 40, 50, 60]);

    const result = ensureRgbPixelData(rgb, width, height);

    expect(result).toBe(rgb);
    expect(Array.from(result)).toEqual([10, 20, 30, 40, 50, 60]);
  });

  it('strips alpha channel from RGBA buffer', () => {
    const width = 2;
    const height = 1;
    const rgba = new Uint8Array([10, 20, 30, 255, 40, 50, 60, 128]);

    const result = ensureRgbPixelData(rgba, width, height);

    expect(Array.from(result)).toEqual([10, 20, 30, 40, 50, 60]);
  });

  it('throws when buffer length does not match expected pixel count', () => {
    const width = 2;
    const height = 1;
    const invalid = new Uint8Array([1, 2, 3]);

    expect(() => ensureRgbPixelData(invalid, width, height)).toThrow(
      /Unexpected pixel buffer length/
    );
  });
});
