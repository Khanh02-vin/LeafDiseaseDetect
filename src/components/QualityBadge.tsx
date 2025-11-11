import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors } from '../constants/colors';

interface QualityBadgeProps {
  isHealthy: boolean;
  hasSpots?: boolean;
  severity?: 'low' | 'moderate' | 'high';
  diseaseSeverity?: number;
  confidence?: number;
  size?: 'small' | 'medium' | 'large';
}

export const QualityBadge: React.FC<QualityBadgeProps> = ({
  isHealthy,
  hasSpots = false,
  severity = 'low',
  diseaseSeverity,
  confidence,
  size = 'medium',
}) => {
  const getBadgeInfo = () => {
    if (isHealthy) {
      return {
        text: 'Lá khỏe mạnh',
        color: Colors.success,
        backgroundColor: Colors.success + '20',
      };
    }

    // Hiển thị mức độ nghiêm trọng dựa trên severity
    if (severity === 'high') {
      return {
        text: 'Bệnh nặng',
        color: Colors.error,
        backgroundColor: Colors.error + '20',
      };
    }

    if (severity === 'moderate' || hasSpots) {
      return {
        text: 'Bệnh phát triển',
        color: Colors.warning,
        backgroundColor: Colors.warning + '20',
      };
    }

    return {
      text: 'Bệnh nhẹ',
      color: Colors.info,
      backgroundColor: Colors.info + '20',
    };
  };

  const badgeInfo = getBadgeInfo();

  const formattedSeverity =
    !isHealthy && typeof diseaseSeverity === 'number'
      ? `${Math.round(diseaseSeverity * 100)}%`
      : undefined;

  return (
    <View style={[styles.container, styles[size], { backgroundColor: badgeInfo.backgroundColor }]}>
      <View style={[styles.dot, { backgroundColor: badgeInfo.color }]} />
      <Text style={[styles.text, styles[`${size}Text`], { color: badgeInfo.color }]}>
        {badgeInfo.text}
      </Text>
      {confidence !== undefined && (
        <Text style={[styles.confidence, styles[`${size}Confidence`]]}>
          {Math.round(confidence * 100)}%
        </Text>
      )}
      {formattedSeverity && (
        <Text style={[styles.confidence, styles[`${size}Confidence`]]}>
          {formattedSeverity}
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  
  // Sizes
  small: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  medium: {
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  large: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  
  text: {
    fontWeight: '600',
    flex: 1,
  },
  
  // Text sizes
  smallText: {
    fontSize: 12,
  },
  mediumText: {
    fontSize: 14,
  },
  largeText: {
    fontSize: 16,
  },
  
  confidence: {
    marginLeft: 4,
    opacity: 0.8,
  },
  
  // Confidence sizes
  smallConfidence: {
    fontSize: 10,
  },
  mediumConfidence: {
    fontSize: 12,
  },
  largeConfidence: {
    fontSize: 14,
  },
});
