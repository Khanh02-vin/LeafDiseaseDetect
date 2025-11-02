import React, { useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
} from 'react-native';
import { useAppStore } from '../store/useAppStore';
import { ScanHistoryItem } from '../components/ScanHistoryItem';
import { EmptyState } from '../components/EmptyState';
import { Button } from '../components/Button';
import { Colors } from '../constants/colors';

export const HistoryScreen: React.FC = () => {
  const {
    history,
    favorites,
    removeFromHistory,
    clearHistory,
    toggleFavorite,
    isLoading,
  } = useAppStore();

  const handleItemPress = useCallback((resultId: string) => {
    // Navigate to detail screen
    console.log('Navigate to detail:', resultId);
  }, []);

  const handleFavorite = useCallback((resultId: string) => {
    toggleFavorite(resultId);
  }, [toggleFavorite]);

  const handleRefresh = useCallback(() => {
    // Refresh logic if needed
  }, []);

  const handleClearHistory = useCallback(() => {
    clearHistory();
  }, [clearHistory]);

  const renderHistoryItem = useCallback(({ item }: { item: any }) => (
    <ScanHistoryItem
      result={item.result}
      onPress={() => handleItemPress(item.id)}
      onFavorite={() => handleFavorite(item.id)}
      isFavorite={favorites.includes(item.id)}
    />
  ), [handleItemPress, handleFavorite, favorites]);

  const renderEmptyState = () => (
    <EmptyState
      title="No scans yet"
      subtitle="Start by capturing an orange image to analyze its quality"
      icon="🍊"
      action={
        <Button
          title="Start Scanning"
          onPress={() => {
            // Navigate to camera screen
            console.log('Navigate to camera');
          }}
        />
      }
    />
  );

  const renderHeader = () => (
    <View style={styles.header}>
      <Text style={styles.title}>Scan History</Text>
      <Text style={styles.subtitle}>
        {history.length} scan{history.length !== 1 ? 's' : ''} recorded
      </Text>
      {history.length > 0 && (
        <Button
          title="Clear All"
          onPress={handleClearHistory}
          variant="danger"
          size="small"
          style={styles.clearButton}
        />
      )}
    </View>
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={history}
        renderItem={renderHistoryItem}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={renderEmptyState}
        refreshControl={
          <RefreshControl
            refreshing={isLoading}
            onRefresh={handleRefresh}
            colors={[Colors.primary]}
            tintColor={Colors.primary}
          />
        }
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  
  listContent: {
    flexGrow: 1,
  },
  
  header: {
    padding: 16,
    backgroundColor: Colors.surface,
    marginBottom: 8,
  },
  
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.text,
    marginBottom: 4,
  },
  
  subtitle: {
    fontSize: 16,
    color: Colors.textSecondary,
    marginBottom: 12,
  },
  
  clearButton: {
    alignSelf: 'flex-start',
  },
});
