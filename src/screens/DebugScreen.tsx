import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { TensorFlowService } from '../services/TensorFlowService';
import { LeafClassifier } from '../services/LeafClassifier';
import { Button } from '../components/Button';
import { Colors } from '../constants/colors';

export const DebugScreen: React.FC = () => {
  const [modelInfo, setModelInfo] = useState<any>(null);
  const [debugResult, setDebugResult] = useState<any>(null);
  const [validatedResult, setValidatedResult] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [batchResults, setBatchResults] = useState<any[]>([]);

  const tfService = TensorFlowService.getInstance();
  const leafClassifier = LeafClassifier.getInstance();

  useEffect(() => {
    loadModelInfo();
  }, []);

  const loadModelInfo = () => {
    const info = tfService.debugModelInfo();
    setModelInfo(info);
  };

  const handleTestImage = useCallback(async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: false,
        quality: 1,
      });

      if (!result.canceled && result.assets[0]) {
        setIsLoading(true);

        // Get raw ML output for debugging
        const debugData = await tfService.debugClassification(result.assets[0].uri);
        setDebugResult(debugData);

        // Get validated result with all checks
        const validated = await leafClassifier.classifyLeaf(result.assets[0].uri);
        setValidatedResult(validated);

        setIsLoading(false);
      }
    } catch (error) {
      Alert.alert('Error', error instanceof Error ? error.message : 'Unknown error');
      setIsLoading(false);
    }
  }, []);

  const handleTestCamera = useCallback(async () => {
    try {
      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: false,
        quality: 1,
      });

      if (!result.canceled && result.assets[0]) {
        setIsLoading(true);

        // Get raw ML output for debugging
        const debugData = await tfService.debugClassification(result.assets[0].uri);
        setDebugResult(debugData);

        // Get validated result with all checks
        const validated = await leafClassifier.classifyLeaf(result.assets[0].uri);
        setValidatedResult(validated);

        setIsLoading(false);
      }
    } catch (error) {
      Alert.alert('Error', error instanceof Error ? error.message : 'Unknown error');
      setIsLoading(false);
    }
  }, []);

  const handleClearResults = () => {
    setDebugResult(null);
    setValidatedResult(null);
    setBatchResults([]);
  };

  const renderModelInfo = () => {
    if (!modelInfo) return null;

    if (modelInfo.error) {
      return (
        <View style={styles.errorCard}>
          <Text style={styles.errorText}>❌ {modelInfo.error}</Text>
        </View>
      );
    }

    return (
      <View style={styles.card}>
        <Text style={styles.cardTitle}>📊 Model Information</Text>
        
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Status:</Text>
          <Text style={[styles.infoValue, { color: modelInfo.isLoaded ? Colors.success : Colors.error }]}>
            {modelInfo.isLoaded ? '✓ Loaded' : '✗ Not Loaded'}
          </Text>
        </View>

        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Version:</Text>
          <Text style={styles.infoValue}>{modelInfo.modelVersion}</Text>
        </View>

        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Labels:</Text>
          <Text style={styles.infoValue}>{modelInfo.labelsCount} classes</Text>
        </View>

        <View style={styles.labelsContainer}>
          {modelInfo.labels.map((label: string, index: number) => (
            <View key={index} style={styles.labelChip}>
              <Text style={styles.labelText}>{label}</Text>
            </View>
          ))}
        </View>

        <Text style={styles.sectionTitle}>Input Shape:</Text>
        {modelInfo.inputs.map((input: any, idx: number) => (
          <View key={idx} style={styles.shapeCard}>
            <Text style={styles.shapeText}>
              {input.name}: {JSON.stringify(input.shape)}
            </Text>
            <Text style={styles.shapeSubtext}>Type: {input.dataType}</Text>
          </View>
        ))}

        <Text style={styles.sectionTitle}>Output Shape:</Text>
        {modelInfo.outputs.map((output: any, idx: number) => (
          <View key={idx} style={styles.shapeCard}>
            <Text style={styles.shapeText}>
              {output.name}: {JSON.stringify(output.shape)}
            </Text>
            <Text style={styles.shapeSubtext}>Type: {output.dataType}</Text>
          </View>
        ))}
      </View>
    );
  };

  const renderValidatedResult = () => {
    if (!validatedResult) return null;

    const hasRejection = validatedResult.fallbackResult || !validatedResult.primaryResult.isLeaf;
    const rejectionReason = validatedResult.fallbackResult?.reason || 'Not identified as a leaf';

    return (
      <View style={styles.card}>
        <Text style={styles.cardTitle}>✅ Validated Result</Text>
        <Text style={styles.subtitle}>
          With LeafClassifier checks (pre-validation, confidence, entropy, gap)
        </Text>

        {/* Validation Status */}
        <View style={[
          styles.validationBanner,
          { backgroundColor: hasRejection ? Colors.error + '20' : Colors.success + '20' }
        ]}>
          <Text style={[
            styles.validationText,
            { color: hasRejection ? Colors.error : Colors.success }
          ]}>
            {hasRejection ? '❌ REJECTED' : '✅ ACCEPTED'}
          </Text>
          {hasRejection && (
            <Text style={[styles.validationReason, { color: Colors.error }]}>
              {rejectionReason}
            </Text>
          )}
        </View>

        {/* Primary Result */}
        <Text style={styles.sectionTitle}>📊 Classification Result:</Text>
        <View style={styles.resultCard}>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Label:</Text>
            <Text style={styles.infoValue}>{validatedResult.primaryResult.label}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Confidence:</Text>
            <Text style={styles.infoValue}>
              {(validatedResult.primaryResult.confidence * 100).toFixed(2)}%
            </Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Is Leaf:</Text>
            <Text style={[styles.infoValue, {
              color: validatedResult.primaryResult.isLeaf ? Colors.success : Colors.error
            }]}>
              {validatedResult.primaryResult.isLeaf ? 'Yes ✓' : 'No ✗'}
            </Text>
          </View>
        </View>

        {/* Fallback Result */}
        {validatedResult.fallbackResult && (
          <>
            <Text style={styles.sectionTitle}>⚠️ Rejection Details:</Text>
            <View style={styles.fallbackCard}>
              <Text style={styles.fallbackLabel}>{validatedResult.fallbackResult.label}</Text>
              <Text style={styles.fallbackReason}>{validatedResult.fallbackResult.reason}</Text>
            </View>
          </>
        )}

        {/* Quality Analysis */}
        <Text style={styles.sectionTitle}>🔬 Quality Analysis:</Text>
        <View style={styles.resultCard}>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Healthy:</Text>
            <Text style={styles.infoValue}>
              {validatedResult.qualityAnalysis.isHealthy ? 'Yes' : 'No'}
            </Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Diseased:</Text>
            <Text style={styles.infoValue}>
              {validatedResult.qualityAnalysis.hasDiseased ? 'Yes' : 'No'}
            </Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Processing Time:</Text>
            <Text style={styles.infoValue}>{validatedResult.processingTime}ms</Text>
          </View>
        </View>
      </View>
    );
  };

  const renderDebugResult = () => {
    if (!debugResult) return null;

    if (!debugResult.success) {
      return (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>❌ Classification Failed</Text>
          <Text style={styles.errorText}>{debugResult.error}</Text>
          <Text style={styles.infoValue}>Time: {debugResult.timing.total}ms</Text>
        </View>
      );
    }

    return (
      <View style={styles.card}>
        <Text style={styles.cardTitle}>🔍 Raw ML Output</Text>
        <Text style={styles.subtitle}>
          Direct from TensorFlow model (no validation)
        </Text>

        {/* Timing */}
        <Text style={styles.sectionTitle}>⏱️ Performance:</Text>
        <View style={styles.timingGrid}>
          <View style={styles.timingItem}>
            <Text style={styles.timingLabel}>Preprocessing</Text>
            <Text style={styles.timingValue}>{debugResult.timing.preprocessing}ms</Text>
          </View>
          <View style={styles.timingItem}>
            <Text style={styles.timingLabel}>Inference</Text>
            <Text style={styles.timingValue}>{debugResult.timing.inference}ms</Text>
          </View>
          <View style={styles.timingItem}>
            <Text style={styles.timingLabel}>Total</Text>
            <Text style={styles.timingValue}>{debugResult.timing.total}ms</Text>
          </View>
        </View>

        {/* Input Tensor Stats */}
        <Text style={styles.sectionTitle}>📥 Input Tensor:</Text>
        <View style={styles.statsCard}>
          <Text style={styles.statsText}>Length: {debugResult.inputTensorStats.length}</Text>
          <Text style={styles.statsText}>Min: {debugResult.inputTensorStats.min.toFixed(4)}</Text>
          <Text style={styles.statsText}>Max: {debugResult.inputTensorStats.max.toFixed(4)}</Text>
          <Text style={styles.statsText}>Mean: {debugResult.inputTensorStats.mean.toFixed(4)}</Text>
          <Text style={styles.statsText}>Std: {debugResult.inputTensorStats.std.toFixed(4)}</Text>
          <Text style={styles.statsSubtext}>
            First 10: [{debugResult.inputTensorStats.first10.map((v: number) => v.toFixed(2)).join(', ')}]
          </Text>
        </View>

        {/* Output Tensor Stats */}
        <Text style={styles.sectionTitle}>📤 Output Tensor:</Text>
        <View style={styles.statsCard}>
          <Text style={styles.statsText}>Length: {debugResult.outputTensorStats.length}</Text>
          <Text style={styles.statsText}>Min: {debugResult.outputTensorStats.min.toFixed(6)}</Text>
          <Text style={styles.statsText}>Max: {debugResult.outputTensorStats.max.toFixed(6)}</Text>
          <Text style={styles.statsText}>Mean: {debugResult.outputTensorStats.mean.toFixed(6)}</Text>
          <Text style={styles.statsSubtext}>
            Values: [{debugResult.outputTensorStats.first10.map((v: number) => v.toFixed(6)).join(', ')}]
          </Text>
        </View>

        {/* Predictions */}
        <Text style={styles.sectionTitle}>🎯 Predictions:</Text>
        {debugResult.predictions.map((pred: any, idx: number) => (
          <View key={idx} style={styles.predictionRow}>
            <View style={styles.predictionBar}>
              <View 
                style={[
                  styles.predictionFill, 
                  { 
                    width: `${pred.confidence * 100}%`,
                    backgroundColor: idx === 0 ? Colors.success : Colors.border,
                  }
                ]} 
              />
            </View>
            <Text style={styles.predictionLabel}>{pred.label}</Text>
            <Text style={styles.predictionValue}>{(pred.confidence * 100).toFixed(2)}%</Text>
          </View>
        ))}
      </View>
    );
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>🐛 Model Debug Console</Text>
      <Text style={styles.subtitle}>Test and inspect TFLite model behavior</Text>

      {renderModelInfo()}

      <View style={styles.actionsCard}>
        <Text style={styles.cardTitle}>🧪 Test Actions</Text>
        
        <Button
          title="📷 Test with Camera"
          onPress={handleTestCamera}
          loading={isLoading}
          style={styles.actionButton}
        />
        
        <Button
          title="🖼️ Test with Gallery"
          onPress={handleTestImage}
          loading={isLoading}
          style={styles.actionButton}
        />
        
        {debugResult && (
          <Button
            title="🗑️ Clear Results"
            onPress={handleClearResults}
            variant="outline"
            style={styles.actionButton}
          />
        )}
      </View>

      {renderValidatedResult()}

      {renderDebugResult()}

      <View style={styles.infoFooter}>
        <Text style={styles.footerText}>
          💡 Tip: Use this screen to verify model predictions, check tensor values, 
          and measure performance. Look for consistent results across similar images.
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
    padding: 16,
  },
  
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.text,
    marginBottom: 4,
  },
  
  subtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginBottom: 20,
  },
  
  card: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  
  errorCard: {
    backgroundColor: Colors.error + '20',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderLeftWidth: 4,
    borderLeftColor: Colors.error,
  },
  
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.text,
    marginBottom: 12,
  },
  
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
    marginTop: 12,
    marginBottom: 8,
  },
  
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
  },
  
  infoLabel: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  
  infoValue: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
  },
  
  labelsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 8,
  },
  
  labelChip: {
    backgroundColor: Colors.primary + '20',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginRight: 8,
    marginBottom: 8,
  },
  
  labelText: {
    fontSize: 12,
    color: Colors.primary,
    fontWeight: '600',
  },
  
  shapeCard: {
    backgroundColor: Colors.background,
    borderRadius: 8,
    padding: 10,
    marginBottom: 8,
  },
  
  shapeText: {
    fontSize: 13,
    fontFamily: 'monospace',
    color: Colors.text,
  },
  
  shapeSubtext: {
    fontSize: 11,
    color: Colors.textSecondary,
    marginTop: 4,
  },
  
  actionsCard: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  
  actionButton: {
    marginBottom: 12,
  },
  
  timingGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  
  timingItem: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: Colors.background,
    borderRadius: 8,
    padding: 10,
    marginHorizontal: 4,
  },
  
  timingLabel: {
    fontSize: 11,
    color: Colors.textSecondary,
    marginBottom: 4,
  },
  
  timingValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.primary,
  },
  
  statsCard: {
    backgroundColor: Colors.background,
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
  },
  
  statsText: {
    fontSize: 13,
    fontFamily: 'monospace',
    color: Colors.text,
    marginBottom: 2,
  },
  
  statsSubtext: {
    fontSize: 10,
    fontFamily: 'monospace',
    color: Colors.textSecondary,
    marginTop: 6,
  },
  
  predictionRow: {
    marginBottom: 12,
  },
  
  predictionBar: {
    height: 24,
    backgroundColor: Colors.border,
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 4,
  },
  
  predictionFill: {
    height: '100%',
    borderRadius: 4,
  },
  
  predictionLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 2,
  },
  
  predictionValue: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  
  errorText: {
    fontSize: 14,
    color: Colors.error,
    marginBottom: 8,
  },
  
  infoFooter: {
    backgroundColor: Colors.info + '20',
    borderRadius: 12,
    padding: 16,
    marginTop: 8,
    marginBottom: 24,
  },
  
  footerText: {
    fontSize: 13,
    color: Colors.info,
    lineHeight: 20,
  },

  validationBanner: {
    borderRadius: 8,
    padding: 12,
    marginVertical: 12,
    borderWidth: 2,
    borderColor: 'transparent',
  },

  validationText: {
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 4,
  },

  validationReason: {
    fontSize: 13,
    textAlign: 'center',
    marginTop: 4,
  },

  resultCard: {
    backgroundColor: Colors.background,
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },

  fallbackCard: {
    backgroundColor: Colors.error + '10',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: Colors.error,
  },

  fallbackLabel: {
    fontSize: 14,
    fontWeight: 'bold',
    color: Colors.error,
    marginBottom: 4,
  },

  fallbackReason: {
    fontSize: 13,
    color: Colors.textSecondary,
  },
});
