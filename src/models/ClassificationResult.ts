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
    isOrange: boolean;
  };
  
  // Fallback classification results
  fallbackResult?: {
    label: string;
    confidence: number;
    reason: string;
  };
  
  // Quality analysis
  qualityAnalysis: {
    isGoodQuality: boolean;
    hasMold: boolean;
    moldConfidence?: number;
    colorAnalysis: {
      dominantColor: string;
      brightness: number;
      saturation: number;
    };
  };
  
  // Image quality
  imageQuality: {
    isHighQuality: boolean;
    resolution: { width: number; height: number };
    fileSize: number;
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
