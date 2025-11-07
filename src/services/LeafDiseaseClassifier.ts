import { TensorFlowService } from './TensorFlowService';
import { ClassificationResult } from '../models/ClassificationResult';
import { ImageQualityChecker } from '../utils/ImageQualityChecker';
import uuid from 'react-native-uuid';

type GeoLocation = { latitude: number; longitude: number; address?: string };

export class LeafDiseaseClassifier {
  private static instance: LeafDiseaseClassifier;
  private tensorFlowService: TensorFlowService;
  private imageQualityChecker: ImageQualityChecker;
  private confidenceThreshold = 0.35;

  private constructor() {
    this.tensorFlowService = TensorFlowService.getInstance();
    this.imageQualityChecker = new ImageQualityChecker();
  }

  public static getInstance(): LeafDiseaseClassifier {
    if (!LeafDiseaseClassifier.instance) {
      LeafDiseaseClassifier.instance = new LeafDiseaseClassifier();
    }
    return LeafDiseaseClassifier.instance;
  }

  public async initialize(): Promise<void> {
    await this.tensorFlowService.initialize();
  }

  public async classifyLeafDisease(
    imageUri: string,
    location?: GeoLocation
  ): Promise<ClassificationResult> {
    const startTime = Date.now();
    const id = uuid.v4() as string;

    try {
      const qualityCheck = await this.imageQualityChecker.checkImageQuality(imageUri);

      const { predictions, processingTime, leafMetrics } = await this.tensorFlowService.classifyImage(imageUri);

      if (!predictions || predictions.length === 0) {
        throw new Error('No predictions returned from ML service');
      }

      const best = predictions[0];
      const isHealthy = /healthy|normal/i.test(best.label);
      const severity = this.estimateSeverity(best.confidence, leafMetrics, isHealthy);

      const primaryResult = {
        label: best.label,
        confidence: best.confidence,
        isHealthy,
        severity,
        recommendedAction: this.getRecommendedAction(isHealthy, severity, leafMetrics),
      };

      const needsFallback =
        primaryResult.confidence < this.confidenceThreshold && predictions.length > 1;

      const fallbackResult = needsFallback
        ? {
            label: predictions[1].label,
            confidence: predictions[1].confidence,
            reason: 'Alternative class selected due to low confidence',
          }
        : undefined;

      const qualityAnalysis = {
        isHealthy,
        hasSpots: leafMetrics.yellowSpots + leafMetrics.brownSpots > 0.35,
        diseaseSeverity: Number(
          Math.min(1, leafMetrics.necrosisLevel + leafMetrics.yellowSpots * 0.5).toFixed(2)
        ),
        symptomSummary: this.composeSymptomSummary(leafMetrics, isHealthy),
        stressIndicators: {
          chlorosis: leafMetrics.chlorosisLevel,
          necrosis: leafMetrics.necrosisLevel,
          pestDamage: Number(
            Math.min(1, leafMetrics.brownSpots + leafMetrics.dryness * 0.4).toFixed(2)
          ),
        },
      };

      return {
        id,
        imageUri,
        timestamp: new Date(),
        location,
        primaryResult,
        fallbackResult,
        qualityAnalysis,
        imageQuality: qualityCheck,
        processingTime: processingTime + (Date.now() - startTime),
        modelVersion: 'leaf-heuristic-1.0.0',
        preprocessingApplied: ['resize', 'normalize', 'color-enhance'],
      };
    } catch (error) {
      console.error('Leaf classification failed:', error);

      return {
        id,
        imageUri,
        timestamp: new Date(),
        location,
        primaryResult: {
          label: 'Unable to analyze',
          confidence: 0,
          isHealthy: false,
          severity: 'high',
          recommendedAction: 'Retake photo with better lighting and focus',
        },
        fallbackResult: {
          label: 'Analysis failed',
          confidence: 0,
          reason: error instanceof Error ? error.message : 'Unknown error',
        },
        qualityAnalysis: {
          isHealthy: false,
          hasSpots: false,
          diseaseSeverity: 1,
          symptomSummary: 'No analysis available',
          stressIndicators: {
            chlorosis: 0,
            necrosis: 0,
            pestDamage: 0,
          },
        },
        imageQuality: {
          isValid: false,
          resolution: { width: 0, height: 0 },
          brightness: 0,
          blur: 1,
          issues: ['Analysis failed'],
        },
        processingTime: Date.now() - startTime,
        modelVersion: 'leaf-heuristic-1.0.0',
        preprocessingApplied: [],
      };
    }
  }

  public setConfidenceThreshold(threshold: number): void {
    this.confidenceThreshold = Math.max(0, Math.min(1, threshold));
  }

  public getConfidenceThreshold(): number {
    return this.confidenceThreshold;
  }

  private estimateSeverity(
    confidence: number,
    metrics: {
      yellowSpots: number;
      brownSpots: number;
      dryness: number;
      necrosisLevel: number;
    },
    isHealthy: boolean
  ): 'low' | 'moderate' | 'high' {
    if (isHealthy) {
      return confidence > 0.7 ? 'low' : 'moderate';
    }

    const severityScore =
      confidence * 0.4 +
      metrics.necrosisLevel * 0.3 +
      (metrics.yellowSpots + metrics.brownSpots) * 0.2 +
      metrics.dryness * 0.1;

    if (severityScore >= 0.6) return 'high';
    if (severityScore >= 0.35) return 'moderate';
    return 'low';
  }

  private getRecommendedAction(
    isHealthy: boolean,
    severity: 'low' | 'moderate' | 'high',
    metrics: {
      chlorosisLevel: number;
      necrosisLevel: number;
      dryness: number;
    }
  ): string {
    if (isHealthy) {
      return 'Lá cây khỏe mạnh. Tiếp tục theo dõi định kỳ.';
    }

    if (severity === 'high') {
      return 'Khử trùng dụng cụ, cắt tỉa lá bệnh và áp dụng thuốc đặc trị theo khuyến cáo.';
    }

    if (metrics.chlorosisLevel > 0.5) {
      return 'Bổ sung dinh dưỡng vi lượng và kiểm tra độ pH đất.';
    }

    if (metrics.dryness > 0.5) {
      return 'Tăng cường tưới nước đúng cách và cải thiện độ ẩm môi trường.';
    }

    return 'Theo dõi thêm, vệ sinh vườn và cân nhắc dùng thuốc phòng bệnh sinh học.';
  }

  private composeSymptomSummary(
    metrics: {
      yellowSpots: number;
      brownSpots: number;
      dryness: number;
      chlorosisLevel: number;
      necrosisLevel: number;
    },
    isHealthy: boolean
  ): string {
    if (isHealthy) {
      return 'Không phát hiện dấu hiệu bệnh rõ rệt.';
    }

    const symptoms: string[] = [];

    if (metrics.yellowSpots > 0.35) {
      symptoms.push('Xuất hiện đốm vàng loang lổ');
    }
    if (metrics.brownSpots > 0.25) {
      symptoms.push('Có dấu hiệu thâm nâu và cháy lá');
    }
    if (metrics.chlorosisLevel > 0.4) {
      symptoms.push('Nguy cơ thiếu dinh dưỡng hoặc bệnh do nấm');
    }
    if (metrics.necrosisLevel > 0.4) {
      symptoms.push('Mô lá bị hoại tử lan rộng');
    }
    if (metrics.dryness > 0.5) {
      symptoms.push('Lá khô và héo do thiếu nước hoặc nắng gắt');
    }

    if (symptoms.length === 0) {
      return 'Bệnh nhẹ, cần theo dõi thêm.';
    }

    return symptoms.join(' • ');
  }
}

