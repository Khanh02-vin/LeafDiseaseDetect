import { Image } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import * as ImageManipulator from 'expo-image-manipulator';
import { Logger, LogCategory } from './Logger';
import { decode } from 'jpeg-js';
import RNFS from 'react-native-fs';
import { ensureRgbPixelData } from './imageUtils';

export interface ImageQualityResult {
  isHighQuality: boolean;
  resolution: { width: number; height: number };
  fileSize: number;
  issues: string[];
}

export class ImageQualityChecker {
  private minWidth = 224;
  private minHeight = 224;
  private minBrightness = 0.1;
  private maxBlur = 0.5;

  public async checkImageQuality(imageUri: string): Promise<ImageQualityResult> {
    const issues: string[] = [];
    
    try {
      Logger.debug(LogCategory.IMAGE, `Starting quality check for image: ${imageUri}`);

      const dimensions = await this.getImageDimensions(imageUri);
      Logger.debug(LogCategory.IMAGE, `Image dimensions: ${dimensions.width}x${dimensions.height}`);
      
      if (dimensions.width < this.minWidth || dimensions.height < this.minHeight) {
        issues.push(`Image too small: ${dimensions.width}x${dimensions.height} (minimum: ${this.minWidth}x${this.minHeight})`);
      }

      const fileSize = await this.getFileSize(imageUri);
      Logger.debug(LogCategory.IMAGE, `Image file size: ${(fileSize / 1024 / 1024).toFixed(2)}MB`);

      const brightness = await this.calculateBrightness(imageUri);
      if (brightness < this.minBrightness) {
        issues.push(`Image too dark: brightness ${brightness.toFixed(2)} (minimum: ${this.minBrightness})`);
      }

      const blur = await this.calculateBlur(imageUri);
      if (blur > this.maxBlur) {
        issues.push(`Image too blurry: blur score ${blur.toFixed(2)} (maximum: ${this.maxBlur})`);
      }

      const isHighQuality = issues.length === 0;
      
      if (isHighQuality) {
        Logger.success(LogCategory.IMAGE, 'Image quality check passed');
      } else {
        Logger.warn(LogCategory.IMAGE, `Image quality issues found: ${issues.length}`, { issues });
      }

      return {
        isHighQuality,
        resolution: dimensions,
        fileSize,
        issues,
      };
    } catch (error) {
      Logger.error(LogCategory.IMAGE, 'Image quality check failed', error);
      return {
        isHighQuality: false,
        resolution: { width: 0, height: 0 },
        fileSize: 0,
        issues: [`Failed to analyze image: ${error}`],
      };
    }
  }

  private async getImageDimensions(imageUri: string): Promise<{ width: number; height: number }> {
    return new Promise((resolve, reject) => {
      Image.getSize(
        imageUri,
        (width, height) => {
          resolve({ width, height });
        },
        (error) => {
          reject(error);
        }
      );
    });
  }

  private async getFileSize(imageUri: string): Promise<number> {
    try {
      const fileInfo = await FileSystem.getInfoAsync(imageUri);
      if (fileInfo.exists && 'size' in fileInfo) {
        return fileInfo.size;
      }
      return 0;
    } catch (error) {
      Logger.warn(LogCategory.IMAGE, 'Failed to get file size', error);
      return 0;
    }
  }

  private async calculateBrightness(imageUri: string): Promise<number> {
    try {
      Logger.debug(LogCategory.IMAGE, 'Calculating real brightness...');
      
      // Resize image to small size for performance
      const manipulatedImage = await ImageManipulator.manipulateAsync(
        imageUri,
        [{ resize: { width: 64, height: 64 } }],
        { compress: 1.0, format: ImageManipulator.SaveFormat.JPEG, base64: false }
      );

      // Extract pixel data
      const { data: pixelData, width, height } = await this.extractPixelData(manipulatedImage.uri);
      
      // Calculate mean brightness (V channel in HSV, or simple average of RGB)
      let totalBrightness = 0;
      const totalPixels = width * height;
      
      for (let i = 0; i < totalPixels; i++) {
        const pixelIndex = i * 3;
        if (pixelIndex + 2 >= pixelData.length) break;
        
        const r = pixelData[pixelIndex] / 255.0;
        const g = pixelData[pixelIndex + 1] / 255.0;
        const b = pixelData[pixelIndex + 2] / 255.0;
        
        // Use max(R,G,B) as brightness (V in HSV)
        const brightness = Math.max(r, g, b);
        totalBrightness += brightness;
      }
      
      const averageBrightness = totalBrightness / totalPixels;
      Logger.debug(LogCategory.IMAGE, `Average brightness: ${averageBrightness.toFixed(3)}`);
      
      return averageBrightness;
    } catch (error) {
      Logger.error(LogCategory.IMAGE, 'Brightness calculation failed', error);
      return 0.5; // Default value on error
    }
  }

  private async calculateBlur(imageUri: string): Promise<number> {
    try {
      Logger.debug(LogCategory.IMAGE, 'Calculating blur using Laplacian variance...');
      
      // Resize to small size for performance
      const manipulatedImage = await ImageManipulator.manipulateAsync(
        imageUri,
        [{ resize: { width: 128, height: 128 } }],
        { compress: 1.0, format: ImageManipulator.SaveFormat.JPEG, base64: false }
      );

      const { data: pixelData, width, height } = await this.extractPixelData(manipulatedImage.uri);
      
      // Convert to grayscale first
      const grayscale = new Float32Array(width * height);
      for (let i = 0; i < width * height; i++) {
        const pixelIndex = i * 3;
        if (pixelIndex + 2 >= pixelData.length) break;
        
        const r = pixelData[pixelIndex] / 255.0;
        const g = pixelData[pixelIndex + 1] / 255.0;
        const b = pixelData[pixelIndex + 2] / 255.0;
        
        // Standard grayscale conversion
        grayscale[i] = 0.299 * r + 0.587 * g + 0.114 * b;
      }
      
      // Apply Laplacian kernel and calculate variance
      // Laplacian kernel: [0 1 0; 1 -4 1; 0 1 0]
      let laplacianSum = 0;
      let laplacianSquaredSum = 0;
      let count = 0;
      
      for (let y = 1; y < height - 1; y++) {
        for (let x = 1; x < width - 1; x++) {
          const idx = y * width + x;
          const laplacian = 
            grayscale[idx - width] +      // top
            grayscale[idx + width] +      // bottom
            grayscale[idx - 1] +          // left
            grayscale[idx + 1] -          // right
            4 * grayscale[idx];           // center
          
          laplacianSum += laplacian;
          laplacianSquaredSum += laplacian * laplacian;
          count++;
        }
      }
      
      // Calculate variance
      const mean = laplacianSum / count;
      const variance = (laplacianSquaredSum / count) - (mean * mean);
      
      // Normalize to 0-1 range (higher variance = sharper image)
      // Typical variance for sharp images: > 0.01, blurry: < 0.005
      const blurScore = 1.0 - Math.min(variance / 0.02, 1.0); // Invert so higher = more blurry
      
      Logger.debug(LogCategory.IMAGE, `Laplacian variance: ${variance.toFixed(6)}, Blur score: ${blurScore.toFixed(3)}`);
      
      return blurScore;
    } catch (error) {
      Logger.error(LogCategory.IMAGE, 'Blur calculation failed', error);
      return 0.1; // Default value (assume not blurry on error)
    }
  }

  /**
   * Extracts RGB pixel data from a JPEG image
   */
  private async extractPixelData(
    imageUri: string
  ): Promise<{ data: Uint8Array; width: number; height: number }> {
    try {
      let filePath = imageUri;
      if (imageUri.startsWith('file://')) {
        filePath = imageUri.replace('file://', '');
      } else if (imageUri.startsWith('content://') || imageUri.startsWith('ph://')) {
        const tempPath = `${RNFS.CachesDirectoryPath}/temp_quality_check_${Date.now()}.jpg`;
        try {
          const base64 = await RNFS.readFile(imageUri, 'base64');
          await RNFS.writeFile(tempPath, base64, 'base64');
          filePath = tempPath;
        } catch (err) {
          throw new Error(`Failed to read image file: ${err}`);
        }
      }

      const base64Data = await RNFS.readFile(filePath, 'base64');
      const buffer = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0));

      const decoded = decode(buffer, { useTArray: true });
      const decodedWidth = decoded.width;
      const decodedHeight = decoded.height;
      const rgbData = ensureRgbPixelData(decoded.data as Uint8Array, decodedWidth, decodedHeight);
      
      return {
        data: rgbData,
        width: decodedWidth,
        height: decodedHeight,
      };
    } catch (error) {
      Logger.error(LogCategory.IMAGE, 'Failed to extract pixel data for quality check', error);
      throw error;
    }
  }

  public setMinimumResolution(width: number, height: number): void {
    this.minWidth = width;
    this.minHeight = height;
  }

  public setMinimumBrightness(brightness: number): void {
    this.minBrightness = Math.max(0, Math.min(1, brightness));
  }

  public setMaximumBlur(blur: number): void {
    this.maxBlur = Math.max(0, Math.min(1, blur));
  }
}
