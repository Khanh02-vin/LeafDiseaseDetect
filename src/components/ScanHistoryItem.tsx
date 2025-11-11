import React from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { ClassificationResult } from '../models/ClassificationResult';
import { QualityBadge } from './QualityBadge';
import { Colors } from '../constants/colors';

interface ScanHistoryItemProps {
  result: ClassificationResult;
  onPress: () => void;
  onFavorite?: () => void;
  isFavorite?: boolean;
}

const { width } = Dimensions.get('window');
const itemWidth = width - 32; // Account for padding

export const ScanHistoryItem: React.FC<ScanHistoryItemProps> = ({
  result,
  onPress,
  onFavorite,
  isFavorite = false,
}) => {
  const formatDate = (date: Date | string) => {
    // Handle both Date objects and date strings (from persisted storage)
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    
    // Validate date
    if (!dateObj || isNaN(dateObj.getTime())) {
      return 'Unknown date';
    }
    
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(dateObj);
  };


  return (
    <TouchableOpacity style={styles.container} onPress={onPress} activeOpacity={0.8}>
      <Image source={{ uri: result.imageUri }} style={styles.image} />
      
      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={styles.timestamp}>{formatDate(result.timestamp)}</Text>
          {onFavorite && (
            <TouchableOpacity onPress={onFavorite} style={styles.favoriteButton}>
              <Text style={[styles.favoriteIcon, isFavorite && styles.favoriteActive]}>
                {isFavorite ? '♥' : '♡'}
              </Text>
            </TouchableOpacity>
          )}
        </View>
        
        <QualityBadge
          isHealthy={result.qualityAnalysis.isHealthy}
          hasSpots={result.qualityAnalysis.hasSpots}
          severity={result.primaryResult.severity}
          diseaseSeverity={result.qualityAnalysis.diseaseSeverity}
          confidence={result.primaryResult.confidence}
          size="small"
        />

        <View style={styles.diseaseInfo}>
          <Text style={styles.label}>{result.primaryResult.label}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: Colors.card,
    borderRadius: 12,
    marginHorizontal: 16,
    marginVertical: 8,
    padding: 12,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  
  image: {
    width: 80,
    height: 80,
    borderRadius: 8,
    backgroundColor: Colors.surface,
  },
  
  content: {
    flex: 1,
    marginLeft: 12,
    justifyContent: 'space-between',
  },
  
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  
  diseaseInfo: {
    marginTop: 6,
  },

  label: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
  },

  timestamp: {
    fontSize: 14,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  
  favoriteButton: {
    padding: 4,
  },
  
  favoriteIcon: {
    fontSize: 18,
    color: Colors.textSecondary,
  },
  
  favoriteActive: {
    color: Colors.error,
  },
  
});
