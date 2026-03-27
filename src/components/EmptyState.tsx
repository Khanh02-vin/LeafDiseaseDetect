import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors } from '../constants/colors';

interface EmptyStateProps {
  title: string;
  subtitle?: string;
  icon?: string;
  action?: React.ReactNode;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  title,
  subtitle,
  icon = '📷',
  action,
}) => {
  return (
    <View style={styles.container}>
      <Text style={styles.icon}>{icon}</Text>
      <Text style={styles.title}>{title}</Text>
      {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
      {action && <View style={styles.action}>{action}</View>}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingVertical: 48,
  },
  
  icon: {
    fontSize: 64,
    marginBottom: 16,
  },
  
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: Colors.text,
    textAlign: 'center',
    marginBottom: 8,
  },
  
  subtitle: {
    fontSize: 16,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 24,
  },
  
  action: {
    marginTop: 16,
  },
});
