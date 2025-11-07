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
import { Button } from '../components/Button';
import { Colors } from '../constants/colors';

const { width, height } = Dimensions.get('window');

export const ColorDetectorScreen: React.FC = () => {
  const [permission, requestPermission] = useCameraPermissions();
  const [cameraRef, setCameraRef] = useState<CameraView | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  
  const { 
    setCurrentScan, 
    addToHistory, 
    setLoading, 
    setError,
    isLoading 
  } = useAppStore();

  const leafClassifier = LeafDiseaseClassifier.getInstance();

  const requestCameraPermission = useCallback(async () => {
    await requestPermission();
  }, [requestPermission]);

  const takePicture = useCallback(async () => {
    if (!cameraRef) return;

    try {
      setLoading(true);
      const photo = await cameraRef.takePictureAsync({
        quality: 0.8,
        base64: false,
      });
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
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        setCapturedImage(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Failed to pick image:', error);
      setError('Failed to select image');
    }
  }, [setError]);

  const analyzeImage = useCallback(async () => {
    if (!capturedImage) return;

    try {
      setIsProcessing(true);
      setLoading(true);
      
      const result = await leafClassifier.classifyLeafDisease(capturedImage);
      
      setCurrentScan(result);
      addToHistory(result);
      
      // Navigate to results screen
      // navigation.navigate('ScanResult');
      
    } catch (error) {
      console.error('Analysis failed:', error);
      Alert.alert('Analysis Failed', 'Unable to analyze the image. Please try again.');
    } finally {
      setIsProcessing(false);
      setLoading(false);
    }
  }, [capturedImage, leafClassifier, setCurrentScan, addToHistory, setLoading]);

  const resetCamera = useCallback(() => {
    setCapturedImage(null);
  }, []);

  React.useEffect(() => {
    leafClassifier.initialize();
  }, [leafClassifier]);

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
        <View style={styles.imageContainer}>
          <Image source={{ uri: capturedImage }} style={styles.image} />
          <View style={styles.imageOverlay}>
            <Button
              title="Phân tích"
              onPress={analyzeImage}
              loading={isProcessing}
              disabled={isProcessing}
              style={styles.analyzeButton}
            />
            <Button
              title="Chụp lại"
              onPress={resetCamera}
              variant="outline"
              style={styles.retakeButton}
            />
          </View>
        </View>
      ) : (
        <View style={styles.cameraContainer}>
          <CameraView
            style={styles.camera}
            facing="back"
            ref={setCameraRef}
          />
          
          {/* Overlay positioned absolutely over camera */}
          <View style={styles.cameraOverlay}>
            {/* Leaf capture overlay */}
            <View style={styles.detectionOverlay}>
              <View style={styles.detectionCircle}>
                <View style={styles.circleBorder} />
                <Text style={styles.detectionText}>Đặt lá cây vào vùng này</Text>
              </View>
            </View>
            
            <View style={styles.cameraControls}>
              <Button
                title="📷 Chụp ảnh"
                onPress={takePicture}
                loading={isLoading}
                disabled={isLoading}
                style={styles.captureButton}
              />
              <Button
                title="📁 Thư viện"
                onPress={pickImage}
                variant="outline"
                style={styles.galleryButton}
              />
            </View>
          </View>
        </View>
      )}

      <View style={styles.instructions}>
        <Text style={styles.instructionTitle}>Hướng dẫn sử dụng:</Text>
        <Text style={styles.instructionText}>
          1. Đặt toàn bộ lá cây trong khung tròn
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
    marginBottom: 24,
    position: 'relative',
  },
  
  camera: {
    flex: 1,
  },
  
  cameraOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'transparent',
    justifyContent: 'space-between',
  },
  
  detectionOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 40,
  },
  
  detectionCircle: {
    width: 200,
    height: 200,
    justifyContent: 'center',
    alignItems: 'center',
  },
  
  circleBorder: {
    width: 200,
    height: 200,
    borderRadius: 100,
    borderWidth: 3,
    borderColor: '#FF6B35',
    borderStyle: 'dashed',
    position: 'absolute',
  },
  
  detectionText: {
    color: '#FF6B35',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginTop: 20,
  },
  
  cameraControls: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    padding: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  
  captureButton: {
    flex: 1,
    marginRight: 8,
  },
  
  galleryButton: {
    flex: 1,
    marginLeft: 8,
  },
  
  imageContainer: {
    position: 'relative',
    marginBottom: 24,
  },
  
  image: {
    width: '100%',
    height: height * 0.4,
    borderRadius: 16,
  },
  
  imageOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    padding: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 16,
  },
  
  analyzeButton: {
    flex: 1,
    marginRight: 8,
  },
  
  retakeButton: {
    flex: 1,
    marginLeft: 8,
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
