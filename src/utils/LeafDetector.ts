import { decode } from 'jpeg-js';
import * as ImageManipulator from 'expo-image-manipulator';
import RNFS from 'react-native-fs';
import { Logger, LogCategory } from './Logger';

/**
 * LeafDetector - Color-based leaf detection utility
 * Detects if an image is likely to be a leaf by analyzing green hue percentage
 */
export class LeafDetector {
  private static readonly GREEN_HUE_MIN = 90; // 90 degrees in HSV (green start)
  private static readonly GREEN_HUE_MAX = 150; // 150 degrees in HSV (green end)
  private static readonly MIN_GREEN_PERCENTAGE = 0.30; // 30% of pixels must be green
  private static readonly SAMPLE_SIZE = 224; // Downsample to this size for performance

  /**
   * Checks if an image is likely to be a leaf based on green color analysis
   * @param imageUri URI of the image to analyze
   * @returns true if image likely contains a leaf (>= 20% green pixels), false otherwise
   */
  public static async isLikelyLeaf(imageUri: string): Promise<boolean> {
    try {
      Logger.debug(LogCategory.IMAGE, 'Starting color-based leaf detection...');

      // Resize image to sample size for performance
      const manipulatedImage = await ImageManipulator.manipulateAsync(
        imageUri,
        [{ resize: { width: this.SAMPLE_SIZE, height: this.SAMPLE_SIZE } }],
        { compress: 1.0, format: ImageManipulator.SaveFormat.JPEG, base64: false }
      );

      const resizedUri = manipulatedImage.uri;
      Logger.debug(LogCategory.IMAGE, `Image resized to ${this.SAMPLE_SIZE}x${this.SAMPLE_SIZE} for color analysis`);

      // Extract pixel data
      const pixelData = await this.extractPixelData(resizedUri, this.SAMPLE_SIZE, this.SAMPLE_SIZE);
      
      // Count green pixels
      const greenPixelCount = this.countGreenPixels(pixelData, this.SAMPLE_SIZE, this.SAMPLE_SIZE);
      const totalPixels = this.SAMPLE_SIZE * this.SAMPLE_SIZE;
      const greenPercentage = greenPixelCount / totalPixels;

      Logger.debug(LogCategory.IMAGE, `Green pixels: ${greenPixelCount}/${totalPixels} (${(greenPercentage * 100).toFixed(1)}%)`);

      const isLeaf = greenPercentage >= this.MIN_GREEN_PERCENTAGE;
      
      if (isLeaf) {
        Logger.success(LogCategory.IMAGE, `Image likely contains a leaf (${(greenPercentage * 100).toFixed(1)}% green)`);
      } else {
        Logger.warn(LogCategory.IMAGE, `Image unlikely to be a leaf (${(greenPercentage * 100).toFixed(1)}% green < ${(this.MIN_GREEN_PERCENTAGE * 100)}%)`);
      }

      return isLeaf;
    } catch (error) {
      Logger.error(LogCategory.IMAGE, 'Color-based leaf detection failed', error);
      // On error, reject the image (fail safe) - better to reject than false positive
      return false;
    }
  }

  /**
   * Extracts RGB pixel data from a JPEG image
   */
  private static async extractPixelData(imageUri: string, width: number, height: number): Promise<Uint8Array> {
    try {
      // Handle different URI formats
      let filePath = imageUri;
      if (imageUri.startsWith('file://')) {
        filePath = imageUri.replace('file://', '');
      } else if (imageUri.startsWith('content://') || imageUri.startsWith('ph://')) {
        // For content URIs, copy to temp file
        const tempPath = `${RNFS.CachesDirectoryPath}/temp_leaf_check_${Date.now()}.jpg`;
        try {
          const base64 = await RNFS.readFile(imageUri, 'base64');
          await RNFS.writeFile(tempPath, base64, 'base64');
          filePath = tempPath;
        } catch (err) {
          throw new Error(`Failed to read image file: ${err}`);
        }
      }

      // Read file as base64
      const base64Data = await RNFS.readFile(filePath, 'base64');
      
      // Convert base64 to binary buffer
      const binaryString = atob(base64Data);
      const buffer = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        buffer[i] = binaryString.charCodeAt(i);
      }

      // Decode JPEG
      const decoded = decode(buffer, { useTArray: true });
      
      // Extract RGB pixels
      return decoded.data; // Uint8Array in RGB format (3 bytes per pixel)
    } catch (error) {
      Logger.error(LogCategory.IMAGE, 'Failed to extract pixel data for color analysis', error);
      throw error;
    }
  }

  /**
   * Counts pixels with green hue (90-150 degrees in HSV)
   * @param pixelData RGB pixel data (Uint8Array, 3 bytes per pixel)
   * @param width Image width
   * @param height Image height
   * @returns Number of green pixels
   */
  private static countGreenPixels(pixelData: Uint8Array, width: number, height: number): number {
    let greenCount = 0;
    const totalPixels = width * height;

    for (let i = 0; i < totalPixels; i++) {
      const pixelIndex = i * 3;
      
      if (pixelIndex + 2 >= pixelData.length) break;

      const r = pixelData[pixelIndex] / 255.0;
      const g = pixelData[pixelIndex + 1] / 255.0;
      const b = pixelData[pixelIndex + 2] / 255.0;

      // Convert RGB to HSV
      const hsv = this.rgbToHsv(r, g, b);
      
      // Check if hue is in green range (90-150 degrees)
      // HSV hue is in range 0-360, but we need to handle wrap-around
      let hue = hsv.h;
      if (hue < 0) hue += 360;

      if (hue >= this.GREEN_HUE_MIN && hue <= this.GREEN_HUE_MAX) {
        greenCount++;
      }
    }

    return greenCount;
  }

  /**
   * Converts RGB to HSV color space
   * @param r Red component (0-1)
   * @param g Green component (0-1)
   * @param b Blue component (0-1)
   * @returns HSV values {h: 0-360, s: 0-1, v: 0-1}
   */
  private static rgbToHsv(r: number, g: number, b: number): { h: number; s: number; v: number } {
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const delta = max - min;

    let h = 0;
    if (delta !== 0) {
      if (max === r) {
        h = ((g - b) / delta) % 6;
      } else if (max === g) {
        h = (b - r) / delta + 2;
      } else {
        h = (r - g) / delta + 4;
      }
    }
    h = h * 60; // Convert to degrees
    if (h < 0) h += 360;

    const s = max === 0 ? 0 : delta / max;
    const v = max;

    return { h, s, v };
  }
}











