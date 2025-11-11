import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Alert,
  Image,
  Dimensions,
  ScrollView,
} from 'react-native';
import { CameraView, CameraType, useCameraPermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import { useAppStore } from '../store/useAppStore';
import { LeafDiseaseClassifier } from '../services/LeafDiseaseClassifier';
import { ClassificationResult } from '../models/ClassificationResult';
import { Button } from '../components/Button';
import { Colors } from '../constants/colors';

const { width, height } = Dimensions.get('window');

export const ColorDetectorScreen: React.FC = () => {
  const [permission, requestPermission] = useCameraPermissions();
  const [cameraRef, setCameraRef] = useState<CameraView | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<ClassificationResult | null>(null);
  
  const { 
    setCurrentScan, 
    addToHistory, 
    setLoading, 
    setError,
    isLoading,
    currentScan 
  } = useAppStore();

  const requestCameraPermission = useCallback(async () => {
    await requestPermission();
  }, [requestPermission]);

  const takePicture = useCallback(async () => {
    if (!cameraRef) return;

    try {
      setLoading(true);
      const photo = await cameraRef.takePictureAsync({
        quality: 0.9,
        base64: false,
        skipProcessing: false,
      });
      // 使用整个图像，不进行裁剪
      setCapturedImage(photo.uri);
    } catch (error) {
      console.error('Failed to take picture:', error);
      setError('Failed to capture image');
    } finally {
      setLoading(false);
    }
  }, [cameraRef, setLoading, setError]);

  const pickImage = useCallback(async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: false, // 不使用裁剪，使用整个图像
        quality: 0.9,
      });

      if (!result.canceled && result.assets[0]) {
        // 使用整个图像进行分析
        setCapturedImage(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Failed to pick image:', error);
      setError('Failed to select image');
    }
  }, [setError]);

  const analyzeImage = useCallback(async () => {
    if (!capturedImage) {
      Alert.alert('Lỗi', 'Không có ảnh để phân tích. Vui lòng chụp hoặc chọn ảnh trước.');
      return;
    }

    try {
      setIsProcessing(true);
      setLoading(true);
      setError(null);
      
      console.log('Bắt đầu phân tích ảnh:', capturedImage);
      
      // Đảm bảo classifier đã được khởi tạo
      const classifier = LeafDiseaseClassifier.getInstance();
      if (!classifier) {
        throw new Error('Không thể khởi tạo classifier');
      }
      
      const result = await classifier.classifyLeafDisease(capturedImage);
      
      // 检查是否使用降级模式
      if (classifier.isUsingFallbackMode && classifier.isUsingFallbackMode()) {
        console.warn('正在使用降级模式（模拟分类）');
      }
      
      console.log('Kết quả phân tích:', result);
      
      if (result && result.primaryResult) {
        setCurrentScan(result);
        addToHistory(result);
        setAnalysisResult(result);
      } else {
        throw new Error('Kết quả phân tích không hợp lệ');
      }
      
    } catch (error) {
      console.error('Lỗi khi phân tích:', error);
      const errorMessage = error instanceof Error ? error.message : 'Không thể phân tích ảnh. Vui lòng thử lại.';
      setError(errorMessage);
      Alert.alert('Lỗi phân tích', errorMessage);
    } finally {
      setIsProcessing(false);
      setLoading(false);
    }
  }, [capturedImage, setCurrentScan, addToHistory, setLoading, setError]);

  const resetCamera = useCallback(() => {
    setCapturedImage(null);
    setAnalysisResult(null);
  }, []);

  React.useEffect(() => {
    // Khởi tạo classifier khi component mount
    const initClassifier = async () => {
      try {
        const classifier = LeafDiseaseClassifier.getInstance();
        if (classifier) {
          await classifier.initialize();
          console.log('Classifier đã được khởi tạo thành công');
        } else {
          console.error('LeafDiseaseClassifier.getInstance() returned undefined');
          // 不设置错误，让它在使用时自动初始化
        }
      } catch (error) {
        console.error('Lỗi khởi tạo classifier:', error);
        // 不设置错误状态，允许延迟初始化
        // 错误会在实际使用时显示
        const errorMessage = error instanceof Error ? error.message : 'Không thể khởi tạo hệ thống phân tích';
        console.warn('初始化失败，将在使用时重试:', errorMessage);
      }
    };
    
    initClassifier();
    
    // Reset state khi component unmount để tránh state bị kẹt
    return () => {
      setIsProcessing(false);
      setLoading(false);
    };
  }, [setError]);

  if (!permission) {
    return (
      <View style={styles.container}>
        <Text style={styles.message}>Requesting camera permission...</Text>
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={styles.container}>
        <Text style={styles.message}>Camera permission denied</Text>
        <Button title="Grant Permission" onPress={requestCameraPermission} />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Leaf Disease Detector</Text>
      <Text style={styles.subtitle}>Chụp hoặc chọn ảnh lá để phân tích tình trạng bệnh</Text>

      {capturedImage ? (
        <>
          <View style={styles.imageContainer}>
            <Image source={{ uri: capturedImage }} style={styles.image} />
          </View>
          {!analysisResult && (
            <View style={styles.imageButtonsContainer}>
              <Button
                title={isProcessing ? "Đang phân tích..." : "Phân tích"}
                onPress={analyzeImage}
                loading={isProcessing || isLoading}
                disabled={isProcessing || isLoading}
                size="small"
                style={styles.analyzeButton}
              />
              <Button
                title="Chụp lại"
                onPress={resetCamera}
                variant="outline"
                size="small"
                style={styles.retakeButton}
                disabled={isProcessing || isLoading}
              />
            </View>
          )}
        </>
      ) : (
        <>
          <View style={styles.cameraContainer}>
            <CameraView
              style={styles.camera}
              facing="back"
              ref={setCameraRef}
            />
          </View>
          <View style={styles.cameraButtonsContainer}>
            <Button
              title="📷 Chụp ảnh"
              onPress={takePicture}
              loading={isLoading}
              disabled={isLoading}
              size="small"
              style={styles.captureButton}
            />
            <Button
              title="📁 Thư viện"
              onPress={pickImage}
              variant="outline"
              size="small"
              style={styles.galleryButton}
            />
          </View>
        </>
      )}

      {analysisResult && (
        <View style={styles.resultContainer}>
          <Text style={styles.resultTitle}>Kết quả phân tích</Text>
          <View style={styles.resultBox}>
            <Text style={[
              styles.resultValue,
              analysisResult.primaryResult.label === 'Lá phấn trắng' || 
              analysisResult.primaryResult.label === 'Lá gỉ sắt' 
                ? styles.resultValueDisease 
                : styles.resultValueHealthy
            ]}>
              {analysisResult.primaryResult.label}
            </Text>
            <Text style={styles.resultConfidence}>
              Độ tin cậy: {(analysisResult.primaryResult.confidence * 100).toFixed(1)}%
            </Text>
            <Button
              title="Phân tích lại"
              onPress={() => setAnalysisResult(null)}
              variant="outline"
              size="small"
              style={styles.reanalyzeButton}
            />
          </View>
        </View>
      )}

      <View style={styles.instructions}>
        <Text style={styles.instructionTitle}>Hướng dẫn sử dụng:</Text>
        <Text style={styles.instructionText}>
          1. Đặt toàn bộ lá cây trong khung hình
        </Text>
        <Text style={styles.instructionText}>
          2. Đảm bảo ánh sáng rõ ràng, không bị chói
        </Text>
        <Text style={styles.instructionText}>
          3. Chụp ảnh hoặc chọn từ thư viện
        </Text>
        <Text style={styles.instructionText}>
          4. Chờ hệ thống phân tích kết quả
        </Text>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  
  content: {
    flexGrow: 1,
    padding: 16,
  },
  
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: Colors.text,
    textAlign: 'center',
    marginBottom: 8,
  },
  
  subtitle: {
    fontSize: 16,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: 24,
  },
  
  message: {
    fontSize: 18,
    color: Colors.text,
    textAlign: 'center',
    margin: 20,
  },
  
  cameraContainer: {
    height: height * 0.4,
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 12,
  },
  
  camera: {
    flex: 1,
  },
  
  cameraButtonsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
    marginBottom: 24,
    paddingHorizontal: 16,
  },
  
  captureButton: {
    flex: 1,
    minHeight: 40,
    maxWidth: 150,
  },
  
  galleryButton: {
    flex: 1,
    minHeight: 40,
    maxWidth: 150,
  },
  
  imageContainer: {
    marginBottom: 12,
  },
  
  image: {
    width: '100%',
    height: height * 0.4,
    borderRadius: 16,
  },
  
  imageButtonsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
    marginBottom: 24,
    paddingHorizontal: 16,
  },

  analyzeButton: {
    flex: 1,
    minHeight: 40,
    maxWidth: 150,
  },

  retakeButton: {
    flex: 1,
    minHeight: 40,
    maxWidth: 150,
  },

  resultContainer: {
    marginBottom: 24,
  },

  resultTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.text,
    marginBottom: 12,
  },

  resultBox: {
    backgroundColor: Colors.surface,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border || '#E0E0E0',
  },

  resultLabel: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginBottom: 8,
  },

  resultValue: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 12,
  },

  resultValueDisease: {
    color: '#DC2626',
  },

  resultValueHealthy: {
    color: '#10B981',
  },

  resultConfidence: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginBottom: 8,
  },

  resultSeverity: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginBottom: 16,
  },

  reanalyzeButton: {
    marginTop: 8,
  },
  
  instructions: {
    backgroundColor: Colors.surface,
    padding: 16,
    borderRadius: 12,
    marginTop: 16,
  },
  
  instructionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 8,
  },
  
  instructionText: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginBottom: 4,
  },
});
