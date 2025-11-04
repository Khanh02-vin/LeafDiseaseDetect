import { TensorFlowService } from './TensorFlowService';
import { ClassificationResult } from '../models/ClassificationResult';
import { ImageQualityChecker } from '../utils/ImageQualityChecker';
import { LeafDetector } from '../utils/LeafDetector';
import { Logger, LogCategory } from '../utils/Logger';
import uuid from 'react-native-uuid';

export class LeafClassifier {
  private static instance: LeafClassifier;
  private tensorFlowService: TensorFlowService;
  private imageQualityChecker: ImageQualityChecker;
  private baseConfidenceThreshold = 0.7; // Increased from 0.6 for stricter classification
  private minConfidenceRatio = 2.0; // Top prediction must be 2x higher than second prediction

  private constructor() {
    this.tensorFlowService = TensorFlowService.getInstance();
    this.imageQualityChecker = new ImageQualityChecker();
  }

  public static getInstance(): LeafClassifier {
    if (!LeafClassifier.instance) {
      LeafClassifier.instance = new LeafClassifier();
    }
    return LeafClassifier.instance;
  }

  /**
   * Calculates adaptive confidence threshold based on image quality
   * @param imageQuality Result from image quality analysis
   * @returns Adaptive confidence threshold (0.55 - 0.85) - increased from (0.4 - 0.8)
   */
  private calculateAdaptiveThreshold(imageQuality: any): number {
    let threshold = this.baseConfidenceThreshold;
    
    // Adjust based on image quality
    if (!imageQuality.isHighQuality) {
      threshold -= 0.1; // Lower threshold for poor quality images
    }
    
    // Adjust based on specific quality issues
    if (imageQuality.issues) {
      if (imageQuality.issues.some((issue: string) => issue.includes('dark'))) {
        threshold -= 0.05; // Lower threshold for dark images
      }
      if (imageQuality.issues.some((issue: string) => issue.includes('blurry'))) {
        threshold -= 0.05; // Lower threshold for blurry images
      }
      if (imageQuality.issues.some((issue: string) => issue.includes('small'))) {
        threshold -= 0.1; // Lower threshold for small images
      }
    }
    
    // Ensure threshold stays within reasonable bounds (increased minimum from 0.4 to 0.55)
    return Math.max(0.55, Math.min(0.85, threshold));
  }

  public async initialize(): Promise<void> {
    Logger.info(LogCategory.INIT, 'LeafClassifier initializing...');
    await this.tensorFlowService.initialize();
    Logger.success(LogCategory.INIT, 'LeafClassifier initialized');
  }

  public async classifyLeaf(
    imageUri: string,
    location?: { latitude: number; longitude: number; address?: string }
  ): Promise<ClassificationResult> {
    const startTime = Date.now();
    const id = uuid.v4() as string;

    Logger.info(LogCategory.CLASSIFICATION, `Starting leaf classification - ID: ${id}`);
    if (location) {
      Logger.debug(LogCategory.CLASSIFICATION, `Location provided: ${location.latitude}, ${location.longitude}`);
    }

    try {
      Logger.time('Leaf Classification Pipeline');

      const qualityCheck = await this.imageQualityChecker.checkImageQuality(imageUri);
      
      // Calculate adaptive confidence threshold based on image quality
      const adaptiveThreshold = this.calculateAdaptiveThreshold(qualityCheck);
      Logger.debug(LogCategory.CLASSIFICATION, `Using adaptive confidence threshold: ${adaptiveThreshold.toFixed(2)}`);

      // Pre-validation: Color-based leaf detection (skip expensive ML inference if not a leaf)
      const isLikelyLeaf = await LeafDetector.isLikelyLeaf(imageUri);
      
      if (!isLikelyLeaf) {
        Logger.warn(LogCategory.CLASSIFICATION, 'Image rejected by color-based detection (insufficient green pixels)');
        Logger.timeEnd('Leaf Classification Pipeline');
        
        return {
          id,
          imageUri,
          timestamp: new Date(),
          location,
          primaryResult: {
            label: 'Not a Leaf',
            confidence: 0.0,
            isLeaf: false,
          },
          fallbackResult: {
            label: 'Not a Leaf - Color Analysis',
            confidence: 0.0,
            reason: 'Image does not contain sufficient green pixels to be a leaf',
          },
          qualityAnalysis: {
            isHealthy: false,
            hasDiseased: false,
            diseaseConfidence: 0.0,
            colorAnalysis: {
              dominantColor: 'unknown',
              brightness: 0.0,
              saturation: 0.0,
            },
          },
          imageQuality: qualityCheck,
          processingTime: Date.now() - startTime,
          modelVersion: this.tensorFlowService.getModelInfo().modelVersion,
          preprocessingApplied: ['color-analysis'],
        };
      }

      const { predictions, processingTime } = await this.tensorFlowService.classifyImage(imageUri);
      
      if (!predictions || predictions.length === 0) {
        throw new Error('No predictions returned from ML service');
      }

      const best = predictions[0];
      Logger.info(LogCategory.CLASSIFICATION, `Top prediction: ${best.label} (${(best.confidence * 100).toFixed(1)}%)`);

      // Calculate entropy of probability distribution
      // Higher entropy (> 0.9) means model is confused/uncertain
      const entropy = -predictions.reduce((sum, p) => {
        const prob = p.confidence;
        return sum + (prob > 0 ? prob * Math.log(prob) : 0);
      }, 0) / Math.log(predictions.length);
      
      const isConfused = entropy > 0.9;
      Logger.debug(LogCategory.CLASSIFICATION, `Entropy: ${entropy.toFixed(3)}, Is confused: ${isConfused}`);

      // Calculate confidence gap between top 2 predictions
      const confidenceGap = predictions.length > 1 
        ? predictions[0].confidence - predictions[1].confidence 
        : 1.0;
      const hasLowGap = confidenceGap < 0.15;
      
      // Calculate confidence ratio (top / second) - stronger check than gap
      const confidenceRatio = predictions.length > 1 && predictions[1].confidence > 0
        ? predictions[0].confidence / predictions[1].confidence
        : 10.0; // If no second prediction, assume very confident
      const hasLowRatio = confidenceRatio < this.minConfidenceRatio;
      
      if (hasLowGap) {
        Logger.debug(LogCategory.CLASSIFICATION, `Low confidence gap: ${confidenceGap.toFixed(3)} (top 2 predictions too similar)`);
      }
      
      if (hasLowRatio) {
        Logger.debug(LogCategory.CLASSIFICATION, `Low confidence ratio: ${confidenceRatio.toFixed(2)} (top/second < ${this.minConfidenceRatio})`);
      }

      const primaryResult = {
        label: best.label,
        confidence: best.confidence,
        isLeaf: /leaf|plant/i.test(best.label),
      };

      // Determine if we need fallback: low confidence, not a leaf, high entropy, low gap, or low ratio
      const needsFallback = primaryResult.confidence < adaptiveThreshold || 
                           !primaryResult.isLeaf || 
                           isConfused || 
                           hasLowGap ||
                           hasLowRatio;

      if (needsFallback) {
        let reason = '';
        if (isConfused) {
          reason = `Model uncertain (entropy: ${entropy.toFixed(3)})`;
        } else if (hasLowRatio) {
          reason = `Confidence ratio too low (${confidenceRatio.toFixed(2)} < ${this.minConfidenceRatio})`;
        } else if (hasLowGap) {
          reason = `Predictions too similar (gap: ${(confidenceGap * 100).toFixed(1)}%)`;
        } else if (primaryResult.confidence < adaptiveThreshold) {
          reason = `Confidence ${(primaryResult.confidence * 100).toFixed(1)}% < ${(adaptiveThreshold * 100)}%`;
        } else {
          reason = 'Not identified as a leaf';
        }
        
        Logger.warn(LogCategory.CLASSIFICATION, `Using fallback: ${reason}`);
      }

      // Create fallback result with appropriate message
      let fallbackResult;
      if (needsFallback) {
        let fallbackLabel = 'Not a Leaf - Low Confidence';
        if (isConfused) {
          fallbackLabel = 'Not a Leaf - Model Uncertain';
        } else if (hasLowRatio) {
          fallbackLabel = 'Not a Leaf - Low Confidence Ratio';
        } else if (hasLowGap) {
          fallbackLabel = 'Not a Leaf - Uncertain Classification';
        } else if (primaryResult.confidence < adaptiveThreshold) {
          fallbackLabel = 'Not a Leaf - Low Confidence';
        }

        fallbackResult = {
          label: fallbackLabel,
          confidence: 0.0,
          reason: isConfused 
            ? `Model uncertain (entropy: ${entropy.toFixed(3)})`
            : hasLowRatio
            ? `Confidence ratio too low (${confidenceRatio.toFixed(2)} < ${this.minConfidenceRatio})`
            : hasLowGap
            ? `Predictions too similar (gap: ${(confidenceGap * 100).toFixed(1)}%)`
            : primaryResult.confidence < adaptiveThreshold
            ? `Confidence ${(primaryResult.confidence * 100).toFixed(1)}% < ${(adaptiveThreshold * 100)}%`
            : 'Not identified as a leaf',
        };
        
        // Set isLeaf to false for rejected results
        primaryResult.isLeaf = false;
      }

      const qualityAnalysis = {
        isHealthy: /good|healthy/i.test(primaryResult.label),
        hasDiseased: /disease|bad|sick|infected/i.test(primaryResult.label),
        diseaseConfidence: /disease|bad|sick/i.test(primaryResult.label) ? 0.6 : 0.2,
        colorAnalysis: {
          dominantColor: 'green',
          brightness: 0.7,
          saturation: 0.8,
        },
      };

      Logger.debug(LogCategory.CLASSIFICATION, `Quality analysis: ${qualityAnalysis.isHealthy ? 'Healthy' : 'Diseased'}, Disease: ${qualityAnalysis.hasDiseased}`);

      const totalTime = processingTime + (Date.now() - startTime);
      Logger.timeEnd('Leaf Classification Pipeline');
      Logger.success(LogCategory.CLASSIFICATION, `Classification completed in ${totalTime}ms`);

      return {
        id,
        imageUri,
        timestamp: new Date(),
        location,
        primaryResult,
        fallbackResult,
        qualityAnalysis,
        imageQuality: qualityCheck,
        processingTime: totalTime,
        modelVersion: this.tensorFlowService.getModelInfo().modelVersion,
        preprocessingApplied: ['resize', 'normalize'],
      };
    } catch (error) {
      Logger.error(LogCategory.CLASSIFICATION, 'Classification failed', error);
      
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      Logger.error(LogCategory.CLASSIFICATION, `Error details: ${errorMessage}`);
      
      return {
        id,
        imageUri,
        timestamp: new Date(),
        location,
        primaryResult: {
          label: 'Unable to analyze',
          confidence: 0.0,
          isLeaf: false,
        },
        fallbackResult: {
          label: 'Analysis failed',
          confidence: 0.0,
          reason: errorMessage,
        },
        qualityAnalysis: {
          isHealthy: false,
          hasDiseased: false,
          diseaseConfidence: 0.0,
          colorAnalysis: {
            dominantColor: 'unknown',
            brightness: 0.0,
            saturation: 0.0,
          },
        },
        imageQuality: {
          isHighQuality: false,
          resolution: { width: 0, height: 0 },
          fileSize: 0,
          issues: ['Analysis failed'],
        },
        processingTime: Date.now() - startTime,
        modelVersion: 'error',
        preprocessingApplied: [],
      };
    }
  }

  public setConfidenceThreshold(threshold: number): void {
    const oldThreshold = this.baseConfidenceThreshold;
    this.baseConfidenceThreshold = Math.max(0.4, Math.min(0.8, threshold));
    Logger.info(LogCategory.CLASSIFICATION, `Base confidence threshold updated: ${oldThreshold} -> ${this.baseConfidenceThreshold}`);
  }

  public getConfidenceThreshold(): number {
    return this.baseConfidenceThreshold;
  }
}
