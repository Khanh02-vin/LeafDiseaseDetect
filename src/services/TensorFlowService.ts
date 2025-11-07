import * as FileSystem from 'expo-file-system/legacy';
import { Asset } from 'expo-asset';
import { Image } from 'react-native';
import * as ImageManipulator from 'expo-image-manipulator';
import { loadTensorflowModel } from 'react-native-fast-tflite';
import type { TensorflowModel } from 'react-native-fast-tflite';
import { Logger, LogCategory } from '../utils/Logger';
import { decode } from 'jpeg-js';
import RNFS from 'react-native-fs';
import { ensureRgbPixelData } from '../utils/imageUtils';

export class TensorFlowService {
  private static instance: TensorFlowService;
  private model: TensorflowModel | null = null;
  private labels: string[] = [];
  private isInitialized = false;
  private modelVersion = '1.0.0';

  private constructor() {}

  public static getInstance(): TensorFlowService {
    if (!TensorFlowService.instance) {
      TensorFlowService.instance = new TensorFlowService();
    }
    return TensorFlowService.instance;
  }

  public async initialize(): Promise<void> {
    if (this.isInitialized) {
      Logger.debug(LogCategory.INIT, 'TensorFlow Service already initialized');
      return;
    }

    try {
      Logger.info(LogCategory.INIT, 'TensorFlow Service initializing...');
      Logger.time('TensorFlow Service Initialization');

      await this.loadModel();
      await this.loadLabels();
      
      this.isInitialized = true;
      Logger.timeEnd('TensorFlow Service Initialization');
      Logger.success(LogCategory.INIT, `TensorFlow Service initialized with model v${this.modelVersion}`);
    } catch (error) {
      Logger.error(LogCategory.INIT, 'Failed to initialize ML service', error);
      throw error;
    }
  }

  private async loadModel(): Promise<void> {
    try {
      Logger.info(LogCategory.ML, 'Loading TensorFlow Lite model...');
      
      const modelAsset = Asset.fromModule(require('../../assets/model/plant_disease_model.tflite'));
      await modelAsset.downloadAsync();
      
      const modelUri = modelAsset.localUri || modelAsset.uri;
      Logger.debug(LogCategory.ML, `Model URI: ${modelUri}`);
      
      this.model = await loadTensorflowModel({ url: modelUri });
      
      const modelInfo = this.model.inputs;
      Logger.success(LogCategory.ML, 'Model loaded successfully', {
        inputs: modelInfo.length,
        inputShape: modelInfo[0]?.shape,
        inputType: modelInfo[0]?.dataType,
      });
    } catch (error) {
      Logger.error(LogCategory.ML, 'Failed to load TensorFlow Lite model', error);
      throw error;
    }
  }

  private async loadLabels(): Promise<void> {
    try {
      Logger.info(LogCategory.ML, 'Loading labels...');
      
      const labelsAsset = Asset.fromModule(require('../../assets/model/labels.txt'));
      await labelsAsset.downloadAsync();
      const uri = labelsAsset.localUri || labelsAsset.uri;
      const labelsContent = await FileSystem.readAsStringAsync(uri);
      this.labels = labelsContent
        .split(/\r?\n/)
        .map((l) => l.trim())
        .filter((l) => l.length > 0);
      
      if (this.labels.length === 0) {
        Logger.warn(LogCategory.ML, 'No labels found, using defaults');
        this.labels = ['Healthy Leaf', 'Diseased Leaf'];
      }
      
      Logger.success(LogCategory.ML, `Labels loaded: ${this.labels.length} classes`, { labels: this.labels });
    } catch (error) {
      Logger.warn(LogCategory.ML, 'Failed to load labels, using defaults', error);
      this.labels = ['Healthy Leaf', 'Diseased Leaf'];
    }
  }

  public async classifyImage(imageUri: string): Promise<{
    predictions: Array<{ label: string; confidence: number }>;
    processingTime: number;
  }> {
    const startTime = Date.now();

    if (!this.model) {
      Logger.error(LogCategory.ML, 'Model not loaded, cannot classify image');
      throw new Error('Model not initialized. Call initialize() first.');
    }

    try {
      Logger.info(LogCategory.ML, `Starting classification for image: ${imageUri.substring(imageUri.lastIndexOf('/') + 1)}`);
      Logger.time('Image Classification');

      const inputTensor = await this.preprocessImage(imageUri);
      Logger.debug(LogCategory.ML, 'Image preprocessed, running inference...');

      const inferenceStart = Date.now();
      const outputTensors = await this.model.run([inputTensor]);
      const inferenceTime = Date.now() - inferenceStart;
      Logger.debug(LogCategory.ML, `Inference completed in ${inferenceTime}ms`);

      const predictions = this.parseOutput(outputTensors[0] as Float32Array | Uint8Array);
      
      const processingTime = Date.now() - startTime;
      Logger.timeEnd('Image Classification');
      Logger.success(LogCategory.ML, `Classification complete: ${predictions[0].label} (${(predictions[0].confidence * 100).toFixed(1)}%)`, {
        topPredictions: predictions.slice(0, 3),
        processingTime: `${processingTime}ms`,
      });

      return { predictions, processingTime };
    } catch (error) {
      Logger.error(LogCategory.ML, 'Classification error', error);
      const processingTime = Date.now() - startTime;
      
      return {
        predictions: [
          { label: this.labels[0] || 'Healthy Leaf', confidence: 0.5 },
          { label: this.labels[1] || 'Diseased Leaf', confidence: 0.5 },
        ],
        processingTime
      };
    }
  }

  private async preprocessImage(imageUri: string): Promise<Float32Array> {
    try {
      Logger.debug(LogCategory.ML, 'Preprocessing image...');
      
      const dimensions = await this.getImageDimensions(imageUri);
      Logger.debug(LogCategory.ML, `Original dimensions: ${dimensions.width}x${dimensions.height}`);

      const inputShape = this.model?.inputs[0]?.shape;
      if (!inputShape || inputShape.length < 4) {
        throw new Error('Invalid model input shape');
      }

      const targetHeight = inputShape[1] || 224;
      const targetWidth = inputShape[2] || 224;
      const channels = inputShape[3] || 3;

      Logger.debug(LogCategory.ML, `Target size: ${targetWidth}x${targetHeight}x${channels}`);

      const imageData = await this.loadAndResizeImage(imageUri, targetWidth, targetHeight);
      
      const inputTensor = new Float32Array(targetHeight * targetWidth * channels);
      for (let i = 0; i < inputTensor.length; i++) {
        inputTensor[i] = imageData[i] / 255.0;
      }

      Logger.debug(LogCategory.ML, `Input tensor created: ${inputTensor.length} elements`);
      return inputTensor;
    } catch (error) {
      Logger.error(LogCategory.ML, 'Image preprocessing failed', error);
      throw error;
    }
  }

  private async getImageDimensions(imageUri: string): Promise<{ width: number; height: number }> {
    return new Promise((resolve, reject) => {
      Image.getSize(
        imageUri,
        (width, height) => resolve({ width, height }),
        (error) => reject(error)
      );
    });
  }

  private async loadAndResizeImage(imageUri: string, targetWidth: number, targetHeight: number): Promise<Uint8Array> {
    try {
      Logger.debug(LogCategory.ML, 'Resizing image and extracting pixel data...');
      
      // Resize image to target dimensions using expo-image-manipulator
      // Save as JPEG for efficiency (PNG decoding requires Node.js modules)
      const manipulatedImage = await ImageManipulator.manipulateAsync(
        imageUri,
        [{ resize: { width: targetWidth, height: targetHeight } }],
        { compress: 1.0, format: ImageManipulator.SaveFormat.JPEG, base64: false }
      );

      const resizedUri = manipulatedImage.uri;
      Logger.debug(LogCategory.ML, `Image resized to ${targetWidth}x${targetHeight}, URI: ${resizedUri}`);
      
      // Extract pixel data from the resized image file using expo-gl
      const pixelData = await this.extractPixelDataFromImage(resizedUri, targetWidth, targetHeight);
      
      Logger.debug(LogCategory.ML, `Extracted ${pixelData.length} pixels from resized image`);
      return pixelData;
    } catch (error) {
      Logger.error(LogCategory.ML, 'Failed to load and resize image', error);
      throw new Error(`Image preprocessing failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Extracts RGB pixel data from a JPEG image file
   * Uses jpeg-js library to decode JPEG and extract RGB pixel values
   */
  private async extractPixelDataFromImage(imageUri: string, width: number, height: number): Promise<Uint8Array> {
    try {
      Logger.debug(LogCategory.ML, 'Extracting RGB pixels from JPEG image using jpeg-js...');
      
      if (!imageUri) {
        throw new Error('Image URI is required');
      }

      // Read the image file as base64 using react-native-fs
      // Convert file:// URI to local path if needed
      let filePath = imageUri;
      if (imageUri.startsWith('file://')) {
        filePath = imageUri.replace('file://', '');
      } else if (imageUri.startsWith('content://') || imageUri.startsWith('ph://')) {
        // For content URIs, we need to copy to a temp file first
        const tempPath = `${RNFS.CachesDirectoryPath}/temp_image_${Date.now()}.jpg`;
        await RNFS.copyFileAssets(imageUri, tempPath).catch(async () => {
          // If copyFileAssets fails, try reading directly
          const base64 = await RNFS.readFile(imageUri, 'base64');
          filePath = `${RNFS.CachesDirectoryPath}/temp_image_${Date.now()}.jpg`;
          await RNFS.writeFile(filePath, base64, 'base64');
        });
        filePath = tempPath;
      }
      
      const base64Data = await RNFS.readFile(filePath, 'base64');
      
      // Convert base64 to binary buffer efficiently
      // Use optimized approach to avoid memory leaks with large images
      const buffer = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0));

      // Decode JPEG using jpeg-js
      const decoded = decode(buffer, { useTArray: true });
      const decodedWidth = decoded.width;
      const decodedHeight = decoded.height;
      const rgbData = ensureRgbPixelData(decoded.data as Uint8Array, decodedWidth, decodedHeight);
      
      // Validate dimensions match expected (decoded image might be different due to JPEG scaling)
      if (decodedWidth !== width || decodedHeight !== height) {
        Logger.warn(
          LogCategory.ML,
          `JPEG dimensions mismatch: expected ${width}x${height}, got ${decodedWidth}x${decodedHeight}. Will resize pixel data.`
        );
      }

      // Extract RGB pixels from decoded JPEG data
      // JPEG data from jpeg-js is stored as RGB (3 bytes per pixel)
      const decodedData = rgbData; // Uint8Array in RGB format
      const decodedSize = decodedWidth * decodedHeight * 3;
      const expectedSize = width * height * 3;
      
      let pixelData: Uint8Array;
      
      if (decodedSize === expectedSize) {
        // Perfect match, use directly
        pixelData = decodedData;
      } else {
        // Dimensions don't match - use optimized resizing
        // Instead of manual pixel manipulation, we'll resize the image properly
        Logger.warn(LogCategory.ML, `Image dimensions mismatch detected, using optimized resizing`);
        
        // For now, use a more efficient approach - sample every Nth pixel
        pixelData = new Uint8Array(expectedSize);
        const scaleX = decodedWidth / width;
        const scaleY = decodedHeight / height;
        
        // Optimized sampling with reduced loop overhead
        let destIndex = 0;
        for (let y = 0; y < height; y++) {
          const srcY = Math.floor(y * scaleY) * decodedWidth * 3;
          for (let x = 0; x < width; x++) {
            const srcX = Math.floor(x * scaleX) * 3;
            const srcIndex = srcY + srcX;
            
            if (srcIndex + 2 < decodedSize && destIndex + 2 < expectedSize) {
              pixelData[destIndex] = decodedData[srcIndex];     // R
              pixelData[destIndex + 1] = decodedData[srcIndex + 1]; // G
              pixelData[destIndex + 2] = decodedData[srcIndex + 2]; // B
            }
            destIndex += 3;
          }
        }
      }
      
      Logger.debug(LogCategory.ML, `Extracted ${pixelData.length} RGB bytes from JPEG`);
      Logger.debug(LogCategory.ML, `Sample pixels - R:${pixelData[0]}, G:${pixelData[1]}, B:${pixelData[2]}`);
      
      // Validate expected size
      if (pixelData.length !== expectedSize) {
        Logger.warn(LogCategory.ML, `Pixel data size mismatch: expected ${expectedSize}, got ${pixelData.length}`);
      }
      
      return pixelData;
    } catch (error) {
      Logger.error(LogCategory.ML, 'Failed to extract pixel data from image', error);
      throw error;
    }
  }

  private parseOutput(outputTensor: Float32Array | Uint8Array): Array<{ label: string; confidence: number }> {
    Logger.debug(LogCategory.ML, 'Parsing model output...');

    const predictions: Array<{ label: string; confidence: number }> = [];
    
    for (let i = 0; i < Math.min(outputTensor.length, this.labels.length); i++) {
      predictions.push({
        label: this.labels[i] || `Class ${i}`,
        confidence: outputTensor[i],
      });
    }

    predictions.sort((a, b) => b.confidence - a.confidence);

    Logger.debug(LogCategory.ML, `Parsed ${predictions.length} predictions`);
    return predictions;
  }

  public getModelInfo(): {
    isLoaded: boolean;
    inputShape: number[] | null;
    labels: string[];
    modelVersion: string;
  } {
    const inputShape = this.model?.inputs[0]?.shape || null;
    return {
      isLoaded: this.isInitialized && this.model !== null,
      inputShape,
      labels: this.labels,
      modelVersion: this.modelVersion,
    };
  }

  // Debug Methods
  public debugModelInfo(): any {
    if (!this.model) {
      return { error: 'Model not loaded' };
    }

    const inputs = this.model.inputs.map((input) => ({
      shape: input.shape,
      dataType: input.dataType,
      name: input.name || 'input',
    }));

    const outputs = this.model.outputs.map((output) => ({
      shape: output.shape,
      dataType: output.dataType,
      name: output.name || 'output',
    }));

    return {
      isLoaded: this.isInitialized,
      modelVersion: this.modelVersion,
      inputs,
      outputs,
      labels: this.labels,
      labelsCount: this.labels.length,
    };
  }

  public debugTensorValues(tensor: Float32Array | Uint8Array, label: string): any {
    const arr = Array.from(tensor);
    
    // Calculate min/max without spread operator (to avoid stack overflow)
    let min = arr[0];
    let max = arr[0];
    let sum = 0;
    
    for (let i = 0; i < arr.length; i++) {
      const val = arr[i];
      if (val < min) min = val;
      if (val > max) max = val;
      sum += val;
    }
    
    const mean = sum / arr.length;
    
    // Calculate variance
    let variance = 0;
    for (let i = 0; i < arr.length; i++) {
      variance += Math.pow(arr[i] - mean, 2);
    }
    variance = variance / arr.length;
    const std = Math.sqrt(variance);

    return {
      label,
      length: arr.length,
      min,
      max,
      mean,
      std,
      first10: arr.slice(0, 10),
      last10: arr.slice(-10),
    };
  }

  public async debugClassification(imageUri: string): Promise<any> {
    const startTime = Date.now();
    
    try {
      Logger.info(LogCategory.ML, `[DEBUG] Starting classification for: ${imageUri}`);
      
      // Step 1: Preprocess
      const preprocessStart = Date.now();
      const inputTensor = await this.preprocessImage(imageUri);
      const preprocessTime = Date.now() - preprocessStart;
      
      const tensorStats = this.debugTensorValues(inputTensor, 'Input Tensor');
      Logger.debug(LogCategory.ML, '[DEBUG] Input tensor stats:', tensorStats);
      
      // Step 2: Inference
      const inferenceStart = Date.now();
      const outputTensors = await this.model!.run([inputTensor]);
      const inferenceTime = Date.now() - inferenceStart;
      
      const outputStats = this.debugTensorValues(
        outputTensors[0] as Float32Array | Uint8Array,
        'Output Tensor'
      );
      Logger.debug(LogCategory.ML, '[DEBUG] Output tensor stats:', outputStats);
      
      // Step 3: Parse predictions
      const predictions = this.parseOutput(outputTensors[0] as Float32Array | Uint8Array);
      
      const totalTime = Date.now() - startTime;
      
      return {
        success: true,
        imageUri,
        timing: {
          preprocessing: preprocessTime,
          inference: inferenceTime,
          total: totalTime,
        },
        inputTensorStats: tensorStats,
        outputTensorStats: outputStats,
        predictions,
        modelInfo: this.debugModelInfo(),
      };
    } catch (error) {
      Logger.error(LogCategory.ML, '[DEBUG] Classification failed', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timing: {
          total: Date.now() - startTime,
        },
      };
    }
  }

  public async testBatchImages(imageUris: string[]): Promise<any[]> {
    const results = [];
    
    for (let i = 0; i < imageUris.length; i++) {
      Logger.info(LogCategory.ML, `[DEBUG] Testing image ${i + 1}/${imageUris.length}`);
      const result = await this.debugClassification(imageUris[i]);
      results.push(result);
    }
    
    return results;
  }

  public dispose(): void {
    Logger.info(LogCategory.ML, 'Disposing TensorFlow Service');
    this.model = null;
    this.isInitialized = false;
  }
}
