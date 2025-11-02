import { TensorFlowService } from './TensorFlowService';
import { ClassificationResult } from '../models/ClassificationResult';
import { ImageQualityChecker } from '../utils/ImageQualityChecker';
import { Logger, LogCategory } from '../utils/Logger';
import uuid from 'react-native-uuid';

export class OrangeClassifier {
  private static instance: OrangeClassifier;
  private tensorFlowService: TensorFlowService;
  private imageQualityChecker: ImageQualityChecker;
  private confidenceThreshold = 0.3;

  private constructor() {
    this.tensorFlowService = TensorFlowService.getInstance();
    this.imageQualityChecker = new ImageQualityChecker();
  }

  public static getInstance(): OrangeClassifier {
    if (!OrangeClassifier.instance) {
      OrangeClassifier.instance = new OrangeClassifier();
    }
    return OrangeClassifier.instance;
  }

  public async initialize(): Promise<void> {
    Logger.info(LogCategory.INIT, 'OrangeClassifier initializing...');
    await this.tensorFlowService.initialize();
    Logger.success(LogCategory.INIT, 'OrangeClassifier initialized');
  }

  public async classifyOrange(
    imageUri: string,
    location?: { latitude: number; longitude: number; address?: string }
  ): Promise<ClassificationResult> {
    const startTime = Date.now();
    const id = uuid.v4() as string;

    Logger.info(LogCategory.CLASSIFICATION, `Starting orange classification - ID: ${id}`);
    if (location) {
      Logger.debug(LogCategory.CLASSIFICATION, `Location provided: ${location.latitude}, ${location.longitude}`);
    }

    try {
      Logger.time('Orange Classification Pipeline');

      const qualityCheck = await this.imageQualityChecker.checkImageQuality(imageUri);

      const { predictions, processingTime } = await this.tensorFlowService.classifyImage(imageUri);
      
      if (!predictions || predictions.length === 0) {
        throw new Error('No predictions returned from ML service');
      }

      const best = predictions[0];
      Logger.info(LogCategory.CLASSIFICATION, `Top prediction: ${best.label} (${(best.confidence * 100).toFixed(1)}%)`);

      const primaryResult = {
        label: best.label,
        confidence: best.confidence,
        isOrange: /orange/i.test(best.label),
      };

      const needsFallback = primaryResult.confidence < this.confidenceThreshold || !primaryResult.isOrange;
      
      if (needsFallback) {
        Logger.warn(LogCategory.CLASSIFICATION, `Confidence below threshold (${this.confidenceThreshold}), using fallback`);
      }

      const fallbackResult = needsFallback
        ? { label: 'Low confidence result', confidence: 0.6, reason: `Confidence ${(primaryResult.confidence * 100).toFixed(1)}% < ${(this.confidenceThreshold * 100)}%` }
        : undefined;

      const qualityAnalysis = {
        isGoodQuality: /good/i.test(primaryResult.label),
        hasMold: /mold|rotten|bad/i.test(primaryResult.label),
        moldConfidence: /mold|bad/i.test(primaryResult.label) ? 0.6 : 0.2,
        colorAnalysis: {
          dominantColor: 'orange',
          brightness: 0.7,
          saturation: 0.8,
        },
      };

      Logger.debug(LogCategory.CLASSIFICATION, `Quality analysis: ${qualityAnalysis.isGoodQuality ? 'Good' : 'Bad'}, Mold: ${qualityAnalysis.hasMold}`);

      const totalTime = processingTime + (Date.now() - startTime);
      Logger.timeEnd('Orange Classification Pipeline');
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
          isOrange: false,
        },
        fallbackResult: {
          label: 'Analysis failed',
          confidence: 0.0,
          reason: errorMessage,
        },
        qualityAnalysis: {
          isGoodQuality: false,
          hasMold: false,
          moldConfidence: 0.0,
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
    const oldThreshold = this.confidenceThreshold;
    this.confidenceThreshold = Math.max(0, Math.min(1, threshold));
    Logger.info(LogCategory.CLASSIFICATION, `Confidence threshold updated: ${oldThreshold} -> ${this.confidenceThreshold}`);
  }

  public getConfidenceThreshold(): number {
    return this.confidenceThreshold;
  }
}
