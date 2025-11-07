export interface ClassificationResult {
  id: string;
  imageUri: string;
  timestamp: Date | string;
  location?: {
    latitude: number;
    longitude: number;
    address?: string;
  };
  
  // Primary classification results
  primaryResult: {
    label: string;
    confidence: number;
    isHealthy: boolean;
    severity: 'low' | 'moderate' | 'high';
    recommendedAction: string;
  };
  
  // Fallback classification results
  fallbackResult?: {
    label: string;
    confidence: number;
    reason: string;
  };
  
  // Quality analysis
  qualityAnalysis: {
    isHealthy: boolean;
    hasSpots: boolean;
    diseaseSeverity: number;
    symptomSummary: string;
    stressIndicators: {
      chlorosis: number;
      necrosis: number;
      pestDamage: number;
    };
  };
  
  // Image quality
  imageQuality: {
    isValid: boolean;
    resolution: { width: number; height: number };
    brightness: number;
    blur: number;
    issues: string[];
  };
  
  // Processing metadata
  processingTime: number;
  modelVersion: string;
  preprocessingApplied: string[];
}

export interface HistoryItem {
  id: string;
  imageUri: string;
  timestamp: Date | string;
  result: ClassificationResult;
  isFavorite: boolean;
  notes?: string;
}

export interface ModelInfo {
  id: string;
  name: string;
  version: string;
  size: number;
  accuracy: number;
  lastUpdated: Date | string;
  description: string;
  labels: string[];
}
