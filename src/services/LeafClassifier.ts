import { TensorFlowService } from './TensorFlowService';
import { ClassificationResult } from '../models/ClassificationResult';
import { ImageQualityChecker } from '../utils/ImageQualityChecker';
import { Logger, LogCategory } from '../utils/Logger';
import uuid from 'react-native-uuid';

export class LeafClassifier {
  private static instance: LeafClassifier;
  private tensorFlowService: TensorFlowService;
  private imageQualityChecker: ImageQualityChecker;
  private confidenceThreshold = 0.3;

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

      const { predictions, processingTime } = await this.tensorFlowService.classifyImage(imageUri);
      
      if (!predictions || predictions.length === 0) {
        throw new Error('No predictions returned from ML service');
      }

      const best = predictions[0];
      Logger.info(LogCategory.CLASSIFICATION, `Top prediction: ${best.label} (${(best.confidence * 100).toFixed(1)}%)`);

      const primaryResult = {
        label: best.label,
        confidence: best.confidence,
        isLeaf: /leaf|plant/i.test(best.label),
      };

      const needsFallback = primaryResult.confidence < this.confidenceThreshold || !primaryResult.isLeaf;
      
      if (needsFallback) {
        Logger.warn(LogCategory.CLASSIFICATION, `Confidence below threshold (${this.confidenceThreshold}), using fallback`);
      }

      const fallbackResult = needsFallback
        ? { label: 'Low confidence result', confidence: 0.6, reason: `Confidence ${(primaryResult.confidence * 100).toFixed(1)}% < ${(this.confidenceThreshold * 100)}%` }
        : undefined;

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
    const oldThreshold = this.confidenceThreshold;
    this.confidenceThreshold = Math.max(0, Math.min(1, threshold));
    Logger.info(LogCategory.CLASSIFICATION, `Confidence threshold updated: ${oldThreshold} -> ${this.confidenceThreshold}`);
  }

  public getConfidenceThreshold(): number {
    return this.confidenceThreshold;
  }
}
