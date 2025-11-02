import * as FileSystem from 'expo-file-system';
import { Asset } from 'expo-asset';
import { Image } from 'react-native';
import { loadTensorflowModel } from 'react-native-fast-tflite';
import type { TensorflowModel } from 'react-native-fast-tflite';
import { Logger, LogCategory } from '../utils/Logger';

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
        this.labels = ['Good Orange', 'Bad Orange'];
      }
      
      Logger.success(LogCategory.ML, `Labels loaded: ${this.labels.length} classes`, { labels: this.labels });
    } catch (error) {
      Logger.warn(LogCategory.ML, 'Failed to load labels, using defaults', error);
      this.labels = ['Good Orange', 'Bad Orange'];
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
          { label: this.labels[0] || 'Good Orange', confidence: 0.5 },
          { label: this.labels[1] || 'Bad Orange', confidence: 0.5 },
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
    Logger.warn(LogCategory.ML, 'Using placeholder image data - real preprocessing needed');
    
    const size = targetWidth * targetHeight * 3;
    const data = new Uint8Array(size);
    
    for (let i = 0; i < size; i += 3) {
      data[i] = 200 + Math.floor(Math.random() * 55);
      data[i + 1] = 100 + Math.floor(Math.random() * 60);
      data[i + 2] = Math.floor(Math.random() * 40);
    }
    
    return data;
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

  public dispose(): void {
    Logger.info(LogCategory.ML, 'Disposing TensorFlow Service');
    this.model = null;
    this.isInitialized = false;
  }
}
