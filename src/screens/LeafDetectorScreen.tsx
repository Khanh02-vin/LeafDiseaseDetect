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
import { LeafClassifier } from '../services/LeafClassifier';
import { Button } from '../components/Button';
import { QualityBadge } from '../components/QualityBadge';
import { Colors } from '../constants/colors';
import { Logger, LogCategory } from '../utils/Logger';
import { ErrorBoundary } from '../components/ErrorBoundary';

const { width, height } = Dimensions.get('window');

export const LeafDetectorScreen: React.FC = () => {
  const [permission, requestPermission] = useCameraPermissions();
  const [cameraRef, setCameraRef] = useState<CameraView | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isModelReady, setIsModelReady] = useState(false);
  const [initError, setInitError] = useState<string | null>(null);
  
  const { 
    setCurrentScan, 
    addToHistory, 
    setLoading, 
    setError,
    isLoading,
    currentScan
  } = useAppStore();

  const leafClassifier = LeafClassifier.getInstance();

  const requestCameraPermission = useCallback(async () => {
    await requestPermission();
  }, [requestPermission]);

  const takePicture = useCallback(async () => {
    if (!cameraRef || !isModelReady) return;

    try {
      setLoading(true);
      const photo = await cameraRef.takePictureAsync({
        quality: 1.0,
        base64: false,
      });
      setCapturedImage(photo.uri);
    } catch (error) {
      console.error('Failed to take picture:', error);
      setError('Failed to capture image');
    } finally {
      setLoading(false);
    }
  }, [cameraRef, setLoading, setError, isModelReady]);

  const pickImage = useCallback(async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 1.0,
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
    if (!capturedImage || !isModelReady) return;

    try {
      setIsProcessing(true);
      setLoading(true);
      
      const result = await leafClassifier.classifyLeaf(capturedImage);
      
      setCurrentScan(result);
      addToHistory(result);
      
      // Navigate to results screen
      // navigation.navigate('ScanResult');
      
    } catch (error) {
      console.error('Analysis failed:', error);
      Alert.alert('Analysis Failed', 'Unable to analyze the leaf. Please try again.');
    } finally {
      setIsProcessing(false);
      setLoading(false);
    }
  }, [capturedImage, leafClassifier, setCurrentScan, addToHistory, setLoading, isModelReady]);

  const resetCamera = useCallback(() => {
    setCapturedImage(null);
    setCurrentScan(null);
  }, [setCurrentScan]);

  React.useEffect(() => {
    const initializeModel = async () => {
      try {
        setInitError(null);
        Logger.info(LogCategory.INIT, 'Initializing AI model...');
        await leafClassifier.initialize();
        setIsModelReady(true);
        Logger.success(LogCategory.INIT, 'AI model initialized successfully');
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Failed to initialize AI model';
        setInitError(errorMessage);
        Logger.error(LogCategory.INIT, 'AI model initialization failed', error);
      }
    };
    
    initializeModel();
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

  // Show loading state while model is initializing
  if (!isModelReady) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Initializing AI model...</Text>
          {initError && (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>{initError}</Text>
              <Button 
                title="Retry" 
                onPress={() => window.location.reload()} 
                variant="outline"
              />
            </View>
          )}
        </View>
      </View>
    );
  }

  return (
    <ErrorBoundary
      onError={(error, errorInfo) => {
        Logger.error(LogCategory.APP, 'LeafDetectorScreen error caught', { 
          error: error.message, 
          stack: error.stack 
        });
      }}
    >
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Leaf Disease Detector</Text>
      <Text style={styles.subtitle}>Capture or select a leaf image to analyze</Text>

      {capturedImage ? (
        <View>
          <View style={styles.imageContainer}>
            <Image source={{ uri: capturedImage }} style={styles.image} />
            <View style={styles.imageOverlay}>
              <Button
                title="Analyze"
                onPress={analyzeImage}
                loading={isProcessing}
                disabled={isProcessing}
                style={styles.analyzeButton}
              />
              <Button
                title="Retake"
                onPress={resetCamera}
                variant="outline"
                style={styles.retakeButton}
              />
            </View>
          </View>

          {/* Results Display */}
          {currentScan && !isProcessing && (
            <View style={styles.resultsContainer}>
              <Text style={styles.resultsTitle}>Analysis Results</Text>
              
              <View style={styles.resultCard}>
                <QualityBadge
                  isHealthy={currentScan.qualityAnalysis.isHealthy}
                  hasDiseased={currentScan.qualityAnalysis.hasDiseased}
                  confidence={currentScan.primaryResult.confidence}
                  size="large"
                />
                
                <View style={styles.resultDetails}>
                  <View style={styles.resultRow}>
                    <Text style={styles.resultLabel}>Diagnosis:</Text>
                    <Text style={styles.resultValue}>{currentScan.primaryResult.label}</Text>
                  </View>
                  
                  <View style={styles.resultRow}>
                    <Text style={styles.resultLabel}>Confidence:</Text>
                    <Text style={styles.resultValue}>
                      {(currentScan.primaryResult.confidence * 100).toFixed(1)}%
                    </Text>
                  </View>
                  
                  <View style={styles.resultRow}>
                    <Text style={styles.resultLabel}>Processing Time:</Text>
                    <Text style={styles.resultValue}>{currentScan.processingTime}ms</Text>
                  </View>
                  
                  {currentScan.qualityAnalysis.diseaseConfidence !== undefined && (
                    <View style={styles.resultRow}>
                      <Text style={styles.resultLabel}>Disease Level:</Text>
                      <Text style={styles.resultValue}>
                        {(currentScan.qualityAnalysis.diseaseConfidence * 100).toFixed(0)}%
                      </Text>
                    </View>
                  )}
                </View>
                
                {currentScan.fallbackResult && (
                  <View style={styles.fallbackAlert}>
                    <Text style={styles.fallbackText}>⚠️ {currentScan.fallbackResult.reason}</Text>
                  </View>
                )}
              </View>
            </View>
          )}
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
            {/* Leaf detection frame overlay */}
            <View style={styles.detectionOverlay}>
              <View style={styles.detectionFrame}>
                <View style={styles.frameBorder} />
                <Text style={styles.detectionText}>Position leaf here</Text>
              </View>
            </View>
            
            <View style={styles.cameraControls}>
              <Button
                title="📷 Take Photo"
                onPress={takePicture}
                loading={isLoading}
                disabled={isLoading}
                style={styles.captureButton}
              />
              <Button
                title="📁 Gallery"
                onPress={pickImage}
                variant="outline"
                style={styles.galleryButton}
              />
            </View>
          </View>
        </View>
      )}

      <View style={styles.instructions}>
        <Text style={styles.instructionTitle}>How to use:</Text>
        <Text style={styles.instructionText}>
          1. Position the plant leaf in the center of the frame
        </Text>
        <Text style={styles.instructionText}>
          2. Ensure good lighting for best results
        </Text>
        <Text style={styles.instructionText}>
          3. Tap capture or select from gallery
        </Text>
        <Text style={styles.instructionText}>
          4. Wait for disease analysis to complete
        </Text>
      </View>
    </ScrollView>
    </ErrorBoundary>
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
  
  detectionFrame: {
    width: 220,
    height: 180,
    justifyContent: 'center',
    alignItems: 'center',
  },
  
  frameBorder: {
    width: 220,
    height: 180,
    borderRadius: 20,
    borderWidth: 3,
    borderColor: '#4CAF50',
    borderStyle: 'dashed',
    position: 'absolute',
  },
  
  detectionText: {
    color: '#4CAF50',
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
  
  resultsContainer: {
    marginTop: 24,
    marginBottom: 16,
  },
  
  resultsTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.text,
    marginBottom: 12,
  },
  
  resultCard: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 20,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  
  resultDetails: {
    marginTop: 16,
  },
  
  resultRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  
  resultLabel: {
    fontSize: 15,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  
  resultValue: {
    fontSize: 16,
    color: Colors.text,
    fontWeight: '600',
  },
  
  fallbackAlert: {
    marginTop: 16,
    padding: 12,
    backgroundColor: Colors.warning + '20',
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: Colors.warning,
  },
  
  fallbackText: {
    fontSize: 13,
    color: Colors.warning,
    fontStyle: 'italic',
  },
  
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  
  loadingText: {
    fontSize: 18,
    color: Colors.text,
    marginBottom: 16,
    textAlign: 'center',
  },
  
  errorContainer: {
    alignItems: 'center',
    marginTop: 16,
  },
  
  errorText: {
    fontSize: 14,
    color: Colors.error || '#FF5252',
    textAlign: 'center',
    marginBottom: 12,
  },
});
