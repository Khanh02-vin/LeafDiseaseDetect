import { decode } from 'jpeg-js';
import * as ImageManipulator from 'expo-image-manipulator';
import RNFS from 'react-native-fs';
import { Logger, LogCategory } from './Logger';
import { ensureRgbPixelData } from './imageUtils';

/**
 * LeafDetector - Color-based leaf detection utility
 * Detects if an image is likely to be a leaf by analyzing green hue percentage
 */
export class LeafDetector {
  private static readonly GREEN_HUE_MIN = 85; // 85 degrees in HSV (green start, expanded range)
  private static readonly GREEN_HUE_MAX = 155; // 155 degrees in HSV (green end, expanded range)
  private static readonly MIN_GREEN_PERCENTAGE = 0.08; // 8% of pixels must be green (very permissive for camera images)
  private static readonly MIN_SATURATION = 0.08; // Minimum saturation (very low to accept all natural greens)
  private static readonly MAX_SATURATION = 0.98; // Maximum saturation (filters out artificial colors)
  private static readonly MIN_VALUE = 0.10; // Minimum brightness (filters out very dark images)
  private static readonly MAX_VALUE = 0.98; // Maximum brightness (filters out overexposed images)
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
      const { data: pixelData, width: decodedWidth, height: decodedHeight } = await this.extractPixelData(
        resizedUri
      );
      
      // Count green pixels
      const greenPixelCount = this.countGreenPixels(pixelData, decodedWidth, decodedHeight);
      const totalPixels = decodedWidth * decodedHeight;
      const greenPercentage = greenPixelCount / totalPixels;

      Logger.debug(LogCategory.IMAGE, `Green pixels: ${greenPixelCount}/${totalPixels} (${(greenPercentage * 100).toFixed(1)}%)`);

      const isLeaf = greenPercentage >= this.MIN_GREEN_PERCENTAGE;
      
      // Enhanced logging for debugging camera vs gallery differences
      Logger.info(LogCategory.IMAGE, 
        `Green pixel analysis: ${greenPixelCount}/${totalPixels} (${(greenPercentage * 100).toFixed(1)}%) | ` +
        `Threshold: ${(this.MIN_GREEN_PERCENTAGE * 100).toFixed(0)}% | ` +
        `Result: ${isLeaf ? 'PASS' : 'FAIL'}`
      );
      
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
  private static async extractPixelData(
    imageUri: string
  ): Promise<{ data: Uint8Array; width: number; height: number }> {
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
      const decodedWidth = decoded.width;
      const decodedHeight = decoded.height;
      const rgbData = ensureRgbPixelData(decoded.data as Uint8Array, decodedWidth, decodedHeight);
      
      // Extract RGB pixels
      return {
        data: rgbData,
        width: decodedWidth,
        height: decodedHeight,
      };
    } catch (error) {
      Logger.error(LogCategory.IMAGE, 'Failed to extract pixel data for color analysis', error);
      throw error;
    }
  }

  /**
   * Counts pixels with green hue (90-150 degrees in HSV)
   * Now also checks saturation and value to filter out non-leaf greens
   * @param pixelData RGB pixel data (Uint8Array, 3 bytes per pixel)
   * @param width Image width
   * @param height Image height
   * @returns Number of green pixels that meet all criteria
   */
  private static countGreenPixels(pixelData: Uint8Array, width: number, height: number): number {
    let greenCount = 0;
    const totalPixels = width * height;
    
    let greenHueCount = 0;
    let saturationFailCount = 0;
    let valueFailCount = 0;
    let totalGrayscale = 0;

    for (let i = 0; i < totalPixels; i++) {
      const pixelIndex = i * 3;
      
      if (pixelIndex + 2 >= pixelData.length) break;

      const r = pixelData[pixelIndex] / 255.0;
      const g = pixelData[pixelIndex + 1] / 255.0;
      const b = pixelData[pixelIndex + 2] / 255.0;

      const hsv = this.rgbToHsv(r, g, b);
      
      if (hsv.s < 0.05) totalGrayscale++;
      
      let hue = hsv.h;
      if (hue < 0) hue += 360;

      if (hue >= this.GREEN_HUE_MIN && hue <= this.GREEN_HUE_MAX) {
        greenHueCount++;
        
        if (hsv.s < this.MIN_SATURATION || hsv.s > this.MAX_SATURATION) {
          saturationFailCount++;
          continue;
        }
        
        if (hsv.v < this.MIN_VALUE || hsv.v > this.MAX_VALUE) {
          valueFailCount++;
          continue;
        }
        
        greenCount++;
      }
    }

    Logger.debug(LogCategory.IMAGE, `Color Analysis Details:
      - Total pixels: ${totalPixels}
      - Green hue range (90-150°): ${greenHueCount} pixels (${(greenHueCount/totalPixels*100).toFixed(1)}%)
      - Failed saturation check: ${saturationFailCount} pixels
      - Failed brightness check: ${valueFailCount} pixels
      - Grayscale/desaturated (<5% sat): ${totalGrayscale} pixels (${(totalGrayscale/totalPixels*100).toFixed(1)}%)
      - Final green count: ${greenCount} pixels (${(greenCount/totalPixels*100).toFixed(1)}%)`);

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









