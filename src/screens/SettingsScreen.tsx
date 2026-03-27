import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Switch,
  ScrollView,
  Alert,
} from 'react-native';
import { useAppStore } from '../store/useAppStore';
import { Button } from '../components/Button';
import { Colors } from '../constants/colors';

export const SettingsScreen: React.FC = () => {
  const {
    isDarkMode,
    toggleTheme,
    settings,
    updateSettings,
    clearHistory,
    history,
  } = useAppStore();

  const handleClearHistory = () => {
    Alert.alert(
      'Clear History',
      'Are you sure you want to clear all scan history? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: clearHistory,
        },
      ]
    );
  };

  const handleExportData = () => {
    // Implement data export
    Alert.alert('Export Data', 'Data export feature coming soon!');
  };

  const handleAbout = () => {
    Alert.alert(
      'About Leaf Disease Checker',
      'Version 1.0.0\n\nAn AI-powered app for detecting plant leaf diseases using machine learning.',
      [{ text: 'OK' }]
    );
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Settings</Text>

      {/* Theme Settings */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Appearance</Text>
        <View style={styles.settingItem}>
          <Text style={styles.settingLabel}>Dark Mode</Text>
          <Switch
            value={isDarkMode}
            onValueChange={toggleTheme}
            trackColor={{ false: Colors.border, true: Colors.primary }}
            thumbColor={isDarkMode ? Colors.textDark : Colors.text}
          />
        </View>
      </View>

      {/* Analysis Settings */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Analysis</Text>
        <View style={styles.settingItem}>
          <Text style={styles.settingLabel}>Auto-save scans</Text>
          <Switch
            value={settings.autoSave}
            onValueChange={(value) => updateSettings({ autoSave: value })}
            trackColor={{ false: Colors.border, true: Colors.primary }}
            thumbColor={settings.autoSave ? Colors.textDark : Colors.text}
          />
        </View>
        <View style={styles.settingItem}>
          <Text style={styles.settingLabel}>Location tracking</Text>
          <Switch
            value={settings.locationTracking}
            onValueChange={(value) => updateSettings({ locationTracking: value })}
            trackColor={{ false: Colors.border, true: Colors.primary }}
            thumbColor={settings.locationTracking ? Colors.textDark : Colors.text}
          />
        </View>
        <View style={styles.settingItem}>
          <Text style={styles.settingLabel}>Notifications</Text>
          <Switch
            value={settings.notifications}
            onValueChange={(value) => updateSettings({ notifications: value })}
            trackColor={{ false: Colors.border, true: Colors.primary }}
            thumbColor={settings.notifications ? Colors.textDark : Colors.text}
          />
        </View>
      </View>

      {/* Data Management */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Data</Text>
        <View style={styles.settingItem}>
          <Text style={styles.settingLabel}>Scan history</Text>
          <Text style={styles.settingValue}>{history.length} scans</Text>
        </View>
        <Button
          title="Clear History"
          onPress={handleClearHistory}
          variant="danger"
          size="small"
          style={styles.actionButton}
        />
        <Button
          title="Export Data"
          onPress={handleExportData}
          variant="outline"
          size="small"
          style={styles.actionButton}
        />
      </View>

      {/* Model Information */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Model</Text>
        <View style={styles.settingItem}>
          <Text style={styles.settingLabel}>Version</Text>
          <Text style={styles.settingValue}>{settings.modelVersion}</Text>
        </View>
        <View style={styles.settingItem}>
          <Text style={styles.settingLabel}>Confidence threshold</Text>
          <Text style={styles.settingValue}>{Math.round(settings.confidenceThreshold * 100)}%</Text>
        </View>
      </View>

      {/* About */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>About</Text>
        <Button
          title="About App"
          onPress={handleAbout}
          variant="outline"
          size="small"
          style={styles.actionButton}
        />
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
    fontSize: 28,
    fontWeight: 'bold',
    color: Colors.text,
    marginBottom: 24,
  },
  
  section: {
    marginBottom: 32,
  },
  
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 16,
  },
  
  settingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  
  settingLabel: {
    fontSize: 16,
    color: Colors.text,
    flex: 1,
  },
  
  settingValue: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginLeft: 16,
  },
  
  actionButton: {
    marginTop: 8,
    alignSelf: 'flex-start',
  },
});
