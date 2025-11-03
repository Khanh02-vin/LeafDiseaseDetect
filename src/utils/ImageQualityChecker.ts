import { Image } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import { Logger, LogCategory } from './Logger';

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
    // Simplified brightness calculation
    // In a real implementation, you would analyze the actual image data
    try {
      // This is a placeholder - you would need to implement actual brightness calculation
      // using image processing libraries or native modules
      return 0.7; // Placeholder value
    } catch (error) {
      console.error('Brightness calculation failed:', error);
      return 0.5; // Default value
    }
  }

  private async calculateBlur(imageUri: string): Promise<number> {
    // Simplified blur calculation
    // In a real implementation, you would use edge detection or frequency analysis
    try {
      // This is a placeholder - you would need to implement actual blur detection
      // using image processing libraries or native modules
      return 0.2; // Placeholder value
    } catch (error) {
      console.error('Blur calculation failed:', error);
      return 0.1; // Default value
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
