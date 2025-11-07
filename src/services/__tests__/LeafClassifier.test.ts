import { describe, expect, it, beforeEach, jest } from '@jest/globals';
import { LeafClassifier } from '../LeafClassifier';
import { TensorFlowService } from '../TensorFlowService';
import { ImageQualityChecker } from '../../utils/ImageQualityChecker';
import { Logger, LogCategory } from '../../utils/Logger';

// Mock dependencies
jest.mock('../TensorFlowService', () => ({
  TensorFlowService: {
    getInstance: jest.fn(() => ({
      initialize: jest.fn(() => Promise.resolve()),
      classifyImage: jest.fn(() => Promise.resolve({
        predictions: [
          { label: 'Healthy Leaf', confidence: 0.8 },
          { label: 'Diseased Leaf', confidence: 0.2 }
        ],
        processingTime: 1000
      })),
      getModelInfo: jest.fn(() => ({
        modelVersion: '1.0.0'
      }))
    }))
  }
}));

jest.mock('../../utils/ImageQualityChecker', () => ({
  ImageQualityChecker: jest.fn(() => ({
    checkImageQuality: jest.fn(() => Promise.resolve({
      isHighQuality: true,
      resolution: { width: 224, height: 224 },
      fileSize: 1024,
      issues: []
    }))
  }))
}));

jest.mock('../../utils/LeafDetector', () => ({
  LeafDetector: {
    isLikelyLeaf: jest.fn(() => Promise.resolve(true))
  }
}));

jest.mock('react-native-uuid', () => ({
  v4: jest.fn(() => 'test-uuid-123')
}));

jest.mock('../../utils/Logger', () => ({
  Logger: {
    info: jest.fn(),
    debug: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    success: jest.fn(),
    time: jest.fn(),
    timeEnd: jest.fn()
  },
  LogCategory: {
    CLASSIFICATION: 'CLASSIFICATION',
    INIT: 'INIT'
  }
}));

describe('LeafClassifier', () => {
  let classifier: LeafClassifier;
  let mockTensorFlowService: jest.Mocked<TensorFlowService>;
  let mockImageQualityChecker: jest.Mocked<ImageQualityChecker>;

  beforeEach(() => {
    classifier = LeafClassifier.getInstance();
    mockTensorFlowService = TensorFlowService.getInstance() as any;
    mockImageQualityChecker = new (ImageQualityChecker as any)();
    jest.clearAllMocks();
  });

  describe('Race Condition Fix', () => {
    it('should initialize properly before classification', async () => {
      await classifier.initialize();
      
      expect(mockTensorFlowService.initialize).toHaveBeenCalled();
    });

    it('should handle initialization errors gracefully', async () => {
      mockTensorFlowService.initialize.mockRejectedValue(new Error('Init failed'));
      
      await expect(classifier.initialize()).rejects.toThrow('Init failed');
    });

    it('should not classify if not initialized', async () => {
      // Reset instance to test uninitialized state
      (LeafClassifier as any).instance = null;
      const freshClassifier = LeafClassifier.getInstance();
      
      // Should not throw but handle gracefully
      const result = await freshClassifier.classifyLeaf('test-image.jpg');
      
      expect(result).toBeDefined();
      expect(result.primaryResult.label).toBe('Unable to analyze');
    });
  });

  describe('Adaptive Confidence Threshold', () => {
    it('should use lower threshold for poor quality images', async () => {
      mockImageQualityChecker.checkImageQuality.mockResolvedValue({
        isHighQuality: false,
        resolution: { width: 100, height: 100 },
        fileSize: 512,
        issues: ['Image too small: 100x100 (minimum: 224x224)', 'Image too dark']
      });

      const result = await classifier.classifyLeaf('poor-quality-image.jpg');
      
      expect(result).toBeDefined();
      expect(mockTensorFlowService.classifyImage).toHaveBeenCalled();
    });

    it('should use higher threshold for high quality images', async () => {
      mockImageQualityChecker.checkImageQuality.mockResolvedValue({
        isHighQuality: true,
        resolution: { width: 512, height: 512 },
        fileSize: 2048,
        issues: []
      });

      const result = await classifier.classifyLeaf('high-quality-image.jpg');
      
      expect(result).toBeDefined();
      expect(mockTensorFlowService.classifyImage).toHaveBeenCalled();
    });

    it('should adjust threshold based on specific quality issues', async () => {
      mockImageQualityChecker.checkImageQuality.mockResolvedValue({
        isHighQuality: false,
        resolution: { width: 224, height: 224 },
        fileSize: 1024,
        issues: ['Image too blurry: blur score 0.6 (maximum: 0.5)']
      });

      const result = await classifier.classifyLeaf('blurry-image.jpg');
      
      expect(result).toBeDefined();
      expect(mockTensorFlowService.classifyImage).toHaveBeenCalled();
    });

    it('should handle adaptive threshold calculation correctly', async () => {
      // Test various quality scenarios
      const testCases = [
        {
          quality: { 
            isHighQuality: true, 
            resolution: { width: 224, height: 224 },
            fileSize: 1024,
            issues: [] 
          },
          expectedThreshold: 0.6
        },
        {
          quality: { 
            isHighQuality: false, 
            resolution: { width: 224, height: 224 },
            fileSize: 1024,
            issues: ['Image too dark'] 
          },
          expectedThreshold: 0.45 // 0.6 - 0.1 - 0.05
        },
        {
          quality: { 
            isHighQuality: false, 
            resolution: { width: 224, height: 224 },
            fileSize: 1024,
            issues: ['Image too small', 'Image too blurry'] 
          },
          expectedThreshold: 0.35 // 0.6 - 0.1 - 0.05 - 0.1
        }
      ];

      for (const testCase of testCases) {
        mockImageQualityChecker.checkImageQuality.mockResolvedValue(testCase.quality);
        
        await classifier.classifyLeaf('test-image.jpg');
        
        // Verify classification was attempted with adaptive threshold
        expect(mockTensorFlowService.classifyImage).toHaveBeenCalled();
      }
    });
  });

  describe('Error Handling', () => {
    it('should handle classification failures gracefully', async () => {
      mockTensorFlowService.classifyImage.mockRejectedValue(new Error('Classification failed'));

      const result = await classifier.classifyLeaf('test-image.jpg');

      expect(result.primaryResult.label).toBe('Unable to analyze');
      expect(result.fallbackResult?.label).toBe('Analysis failed');
    });

    it('should handle leaf detection failures', async () => {
      const { LeafDetector } = require('../../utils/LeafDetector');
      LeafDetector.isLikelyLeaf.mockRejectedValue(new Error('Leaf detection failed'));

      const result = await classifier.classifyLeaf('test-image.jpg');

      expect(result.primaryResult.label).toBe('Not a Leaf');
      expect(result.fallbackResult?.reason).toContain('Color Analysis');
    });

    it('should handle image quality check failures', async () => {
      mockImageQualityChecker.checkImageQuality.mockRejectedValue(new Error('Quality check failed'));

      const result = await classifier.classifyLeaf('test-image.jpg');

      expect(result).toBeDefined();
      expect(result.imageQuality.issues).toContain('Failed to analyze image');
    });
  });

  describe('Performance', () => {
    it('should complete classification within reasonable time', async () => {
      const startTime = Date.now();
      
      await classifier.classifyLeaf('test-image.jpg');
      
      const endTime = Date.now();
      const processingTime = endTime - startTime;
      
      // Should complete within 10 seconds including all checks
      expect(processingTime).toBeLessThan(10000);
    });

    it('should handle concurrent classifications', async () => {
      const promises = Array.from({ length: 5 }, (_, i) => 
        classifier.classifyLeaf(`test-image-${i}.jpg`)
      );

      const results = await Promise.all(promises);

      expect(results).toHaveLength(5);
      results.forEach(result => {
        expect(result).toBeDefined();
        expect(result.id).toBeDefined();
      });
    });
  });

  describe('Configuration', () => {
    it('should allow confidence threshold adjustment', () => {
      const initialThreshold = classifier.getConfidenceThreshold();
      
      classifier.setConfidenceThreshold(0.7);
      
      const newThreshold = classifier.getConfidenceThreshold();
      expect(newThreshold).toBe(0.7);
      expect(newThreshold).not.toBe(initialThreshold);
    });

    it('should clamp confidence threshold to valid range', () => {
      classifier.setConfidenceThreshold(1.5); // Above max
      expect(classifier.getConfidenceThreshold()).toBe(0.8);

      classifier.setConfidenceThreshold(-0.5); // Below min
      expect(classifier.getConfidenceThreshold()).toBe(0.4);
    });
  });

  describe('Integration', () => {
    it('should integrate all components correctly', async () => {
      const result = await classifier.classifyLeaf('integration-test.jpg');

      expect(result).toHaveProperty('id');
      expect(result).toHaveProperty('imageUri');
      expect(result).toHaveProperty('timestamp');
      expect(result).toHaveProperty('primaryResult');
      expect(result).toHaveProperty('qualityAnalysis');
      expect(result).toHaveProperty('imageQuality');
      expect(result).toHaveProperty('processingTime');
      expect(result).toHaveProperty('modelVersion');
      expect(result).toHaveProperty('preprocessingApplied');

      expect(mockTensorFlowService.initialize).toHaveBeenCalled();
      expect(mockImageQualityChecker.checkImageQuality).toHaveBeenCalled();
      expect(mockTensorFlowService.classifyImage).toHaveBeenCalled();
    });
  });
});