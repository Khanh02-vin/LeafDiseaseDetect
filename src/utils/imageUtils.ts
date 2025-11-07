/**
 * Normalizes decoded pixel buffers to RGB triplets.
 * jpeg-js defaults to RGBA output, which adds an alpha byte per pixel.
 * Our TensorFlow pipeline expects RGB only, so we strip the alpha channel
 * when necessary and return a tightly packed RGB buffer.
 */
export const ensureRgbPixelData = (
  data: Uint8Array,
  width: number,
  height: number
): Uint8Array => {
  const expectedRgbLength = width * height * 3;
  const expectedRgbaLength = width * height * 4;

  if (data.length === expectedRgbLength) {
    return data;
  }

  if (data.length === expectedRgbaLength) {
    const rgb = new Uint8Array(expectedRgbLength);
    for (let src = 0, dest = 0; src < data.length && dest < expectedRgbLength; src += 4, dest += 3) {
      rgb[dest] = data[src];
      rgb[dest + 1] = data[src + 1];
      rgb[dest + 2] = data[src + 2];
    }
    return rgb;
  }

  throw new Error(
    `Unexpected pixel buffer length ${data.length} for dimensions ${width}x${height}`
  );
};
