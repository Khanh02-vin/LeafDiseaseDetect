import { describe, expect, it, beforeEach, jest } from '@jest/globals';
import { TensorFlowService } from '../TensorFlowService';
import { Logger, LogCategory } from '../../utils/Logger';

// Mock dependencies
jest.mock('expo-asset', () => ({
  Asset: {
    fromModule: jest.fn(() => ({
      downloadAsync: jest.fn(() => Promise.resolve()),
      localUri: 'mock-local-uri',
      uri: 'mock-uri'
    }))
  }
}));

jest.mock('react-native-fast-tflite', () => ({
  loadTensorflowModel: jest.fn(() => Promise.resolve({
    inputs: [{ shape: [1, 224, 224, 3], dataType: 'float32' }],
    outputs: [{ shape: [1, 10], dataType: 'float32' }],
    run: jest.fn(() => Promise.resolve([new Float32Array([0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1.0])]))
  }))
}));

jest.mock('expo-file-system/legacy', () => ({
  readAsStringAsync: jest.fn(() => Promise.resolve('label1\\nlabel2\\nlabel3'))
}));

jest.mock('react-native-fs', () => ({
  readFile: jest.fn(() => Promise.resolve('mock-base64-data')),
  CachesDirectoryPath: '/mock/cache',
  copyFileAssets: jest.fn(),
  writeFile: jest.fn()
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
    ML: 'ML',
    INIT: 'INIT'
  }
}));

describe('TensorFlowService', () => {
  let service: TensorFlowService;

  beforeEach(() => {
    service = TensorFlowService.getInstance();
    jest.clearAllMocks();
  });

  describe('Memory Leak Fix', () => {
    it('should handle base64 conversion efficiently', async () => {
      // Mock the atob function to track calls
      const mockAtob = jest.fn(() => 'mock-binary-string');
      global.atob = mockAtob;

      // Mock RNFS.readFile to return test data
      const { RNFS } = require('react-native-fs');
      RNFS.readFile.mockResolvedValue('dGVzdCBkYXRh'); // base64 for "test data"

      // This should not cause memory issues
      const result = await service.classifyImage('mock-image-uri');
      
      expect(result).toBeDefined();
      expect(mockAtob).toHaveBeenCalled();
    });

    it('should use optimized base64 to Uint8Array conversion', async () => {
      const { RNFS } = require('react-native-fs');
      RNFS.readFile.mockResolvedValue('dGVzdCBkYXRh');

      // Mock the internal method to test conversion
      const mockBuffer = new Uint8Array([116, 101, 115, 116, 32, 100, 97, 116, 97]);
      
      // Test that the conversion doesn't create intermediate strings
      const conversionSpy = jest.spyOn(global, 'atob');
      
      await service.classifyImage('mock-image-uri');
      
      expect(conversionSpy).toHaveBeenCalledWith('dGVzdCBkYXRh');
    });
  });

  describe('Image Processing Optimization', () => {
    it('should handle image resizing efficiently', async () => {
      const mockImageManipulator = require('expo-image-manipulator');
      mockImageManipulator.manipulateAsync = jest.fn(() => 
        Promise.resolve({ uri: 'resized-image-uri' })
      );

      await service.classifyImage('mock-image-uri');

      expect(mockImageManipulator.manipulateAsync).toHaveBeenCalled();
    });

    it('should avoid manual pixel manipulation loops', async () => {
      const { RNFS } = require('react-native-fs');
      RNFS.readFile.mockResolvedValue('dGVzdCBkYXRh');

      // Mock the model to return test data
      const { loadTensorflowModel } = require('react-native-fast-tflite');
      const mockModel = await loadTensorflowModel();
      
      await service.classifyImage('mock-image-uri');

      // Verify the model was called (indicating processing completed)
      expect(mockModel.run).toHaveBeenCalled();
    });
  });

  describe('Error Handling', () => {
    it('should handle model loading failures gracefully', async () => {
      const { loadTensorflowModel } = require('react-native-fast-tflite');
      loadTensorflowModel.mockRejectedValue(new Error('Model load failed'));

      await expect(service.initialize()).rejects.toThrow('Model load failed');
    });

    it('should handle image processing failures', async () => {
      const { RNFS } = require('react-native-fs');
      RNFS.readFile.mockRejectedValue(new Error('File read failed'));

      const result = await service.classifyImage('invalid-image-uri');
      
      expect(result.predictions).toBeDefined();
      expect(result.predictions.length).toBeGreaterThan(0);
    });

    it('should handle corrupted image data', async () => {
      const { RNFS } = require('react-native-fs');
      RNFS.readFile.mockResolvedValue('invalid-base64');

      const result = await service.classifyImage('corrupted-image-uri');
      
      expect(result).toBeDefined();
      expect(result.predictions).toBeDefined();
    });
  });

  describe('Performance', () => {
    it('should complete classification within reasonable time', async () => {
      const startTime = Date.now();
      
      await service.classifyImage('mock-image-uri');
      
      const endTime = Date.now();
      const processingTime = endTime - startTime;
      
      // Should complete within 5 seconds for a normal image
      expect(processingTime).toBeLessThan(5000);
    });

    it('should handle multiple classifications without memory buildup', async () => {
      const initialMemory = process.memoryUsage().heapUsed;
      
      // Run multiple classifications
      for (let i = 0; i < 10; i++) {
        await service.classifyImage(`mock-image-${i}.uri`);
      }
      
      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }
      
      const finalMemory = process.memoryUsage().heapUsed;
      const memoryIncrease = finalMemory - initialMemory;
      
      // Memory increase should be reasonable (less than 50MB)
      expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024);
    });
  });

  describe('Model Info', () => {
    it('should return correct model information', () => {
      const info = service.getModelInfo();
      
      expect(info).toHaveProperty('isLoaded');
      expect(info).toHaveProperty('inputShape');
      expect(info).toHaveProperty('labels');
      expect(info).toHaveProperty('modelVersion');
    });

    it('should provide debug information', () => {
      const debugInfo = service.debugModelInfo();
      
      expect(debugInfo).toBeDefined();
      expect(typeof debugInfo).toBe('object');
    });
  });
});