import React, { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { AppNavigator } from './src/navigation/AppNavigator';
import { Colors } from './src/constants/colors';
import { Logger, LogCategory, LogLevel } from './src/utils/Logger';
import { ErrorBoundary } from './src/components/ErrorBoundary';

export default function App() {
  useEffect(() => {
    if (__DEV__) {
      Logger.setLevel(LogLevel.DEBUG);
      Logger.info(LogCategory.APP, 'Leaf Disease Checker application started in development mode');
    } else {
      Logger.setLevel(LogLevel.INFO);
      Logger.info(LogCategory.APP, 'Leaf Disease Checker application started in production mode');
    }

    const modelInfo = {
      platform: 'React Native',
      expo: true,
      version: '1.0.0',
    };
    Logger.debug(LogCategory.APP, 'App configuration loaded', modelInfo);

    return () => {
      Logger.info(LogCategory.APP, 'Application shutting down');
    };
  }, []);

  return (
    <ErrorBoundary
      onError={(error, errorInfo) => {
        Logger.error(LogCategory.APP, 'App-level error caught', { 
          error: error.message, 
          stack: error.stack 
        });
      }}
    >
      <AppNavigator />
      <StatusBar style="auto" backgroundColor={Colors.background} />
    </ErrorBoundary>
  );
}
