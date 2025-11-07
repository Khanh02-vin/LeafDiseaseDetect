import { describe, expect, it, beforeEach, jest } from '@jest/globals';
import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { Text, View } from 'react-native';
import { ErrorBoundary } from '../ErrorBoundary';
import { Logger, LogCategory } from '../../utils/Logger';

// Mock Logger
jest.mock('../../utils/Logger', () => ({
  Logger: {
    error: jest.fn(),
    info: jest.fn(),
    debug: jest.fn(),
    warn: jest.fn(),
    success: jest.fn()
  },
  LogCategory: {
    APP: 'APP'
  }
}));

describe('ErrorBoundary', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render children when there is no error', () => {
    const TestComponent = () => <Text>Test Content</Text>;
    
    const { getByText } = render(
      <ErrorBoundary>
        <TestComponent />
      </ErrorBoundary>
    );

    expect(getByText('Test Content')).toBeTruthy();
  });

  it('should catch and display error information', async () => {
    const ThrowErrorComponent = () => {
      throw new Error('Test error message');
    };

    const { getByText } = render(
      <ErrorBoundary>
        <ThrowErrorComponent />
      </ErrorBoundary>
    );

    await waitFor(() => {
      expect(getByText('Something went wrong')).toBeTruthy();
      expect(getByText('Test error message')).toBeTruthy();
    });
  });

  it('should call onError callback when error occurs', async () => {
    const onError = jest.fn();
    const ThrowErrorComponent = () => {
      throw new Error('Callback test error');
    };

    render(
      <ErrorBoundary onError={onError}>
        <ThrowErrorComponent />
      </ErrorBoundary>
    );

    await waitFor(() => {
      expect(onError).toHaveBeenCalled();
      expect(onError).toHaveBeenCalledWith(
        expect.any(Error),
        expect.objectContaining({
          componentStack: expect.any(String)
        })
      );
    });
  });

  it('should log error to Logger', async () => {
    const { Logger } = require('../../utils/Logger');
    const ThrowErrorComponent = () => {
      throw new Error('Logger test error');
    };

    render(
      <ErrorBoundary>
        <ThrowErrorComponent />
      </ErrorBoundary>
    );

    await waitFor(() => {
      expect(Logger.error).toHaveBeenCalledWith(
        LogCategory.APP,
        'Error boundary caught an error',
        expect.objectContaining({
          error: 'Logger test error',
          stack: expect.any(String),
          componentStack: expect.any(String)
        })
      );
    });
  });

  it('should display custom fallback when provided', async () => {
    const CustomFallback = () => <Text>Custom Error Fallback</Text>;
    const ThrowErrorComponent = () => {
      throw new Error('Custom fallback test');
    };

    const { getByText, queryByText } = render(
      <ErrorBoundary fallback={<CustomFallback />}>
        <ThrowErrorComponent />
      </ErrorBoundary>
    );

    await waitFor(() => {
      expect(getByText('Custom Error Fallback')).toBeTruthy();
      expect(queryByText('Something went wrong')).toBeFalsy();
    });
  });

  it('should handle retry functionality', async () => {
    let shouldThrow = true;
    const ToggleErrorComponent = () => {
      if (shouldThrow) {
        throw new Error('Retry test error');
      }
      return <Text>No Error</Text>;
    };

    const { getByText } = render(
      <ErrorBoundary>
        <ToggleErrorComponent />
      </ErrorBoundary>
    );

    // Wait for error to be caught
    await waitFor(() => {
      expect(getByText('Something went wrong')).toBeTruthy();
    });

    // Click retry button
    fireEvent.press(getByText('Try Again'));

    // Stop throwing error
    shouldThrow = false;

    // Should render successfully after retry
    await waitFor(() => {
      expect(getByText('No Error')).toBeTruthy();
    });
  });

  it('should display debug info in development mode', async () => {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'development';

    const ThrowErrorComponent = () => {
      const error = new Error('Debug test error');
      error.stack = 'Error: Debug test error\n    at TestComponent';
      throw error;
    };

    const { getByText } = render(
      <ErrorBoundary>
        <ThrowErrorComponent />
      </ErrorBoundary>
    );

    await waitFor(() => {
      expect(getByText('Something went wrong')).toBeTruthy();
      expect(getByText(/Error: Debug test error/)).toBeTruthy();
    });

    process.env.NODE_ENV = originalEnv;
  });

  it('should not display debug info in production mode', async () => {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';

    const ThrowErrorComponent = () => {
      throw new Error('Production test error');
    };

    const { getByText, queryByText } = render(
      <ErrorBoundary>
        <ThrowErrorComponent />
      </ErrorBoundary>
    );

    await waitFor(() => {
      expect(getByText('Something went wrong')).toBeTruthy();
      expect(queryByText(/Error: Production test error/)).toBeFalsy();
    });

    process.env.NODE_ENV = originalEnv;
  });

  it('should handle async errors in useEffect', async () => {
    const AsyncErrorComponent = () => {
      React.useEffect(() => {
        throw new Error('Async error in useEffect');
      }, []);
      return <Text>Async Component</Text>;
    };

    const { getByText } = render(
      <ErrorBoundary>
        <AsyncErrorComponent />
      </ErrorBoundary>
    );

    await waitFor(() => {
      expect(getByText('Something went wrong')).toBeTruthy();
      expect(getByText('Async error in useEffect')).toBeTruthy();
    });
  });

  it('should reset error state when retry is successful', async () => {
    let renderCount = 0;
    const StatefulComponent = () => {
      renderCount++;
      if (renderCount === 1) {
        throw new Error('First render error');
      }
      return <Text>Render {renderCount}</Text>;
    };

    const { getByText } = render(
      <ErrorBoundary>
        <StatefulComponent />
      </ErrorBoundary>
    );

    // First render should fail
    await waitFor(() => {
      expect(getByText('Something went wrong')).toBeTruthy();
    });

    // Retry should succeed
    fireEvent.press(getByText('Try Again'));

    await waitFor(() => {
      expect(getByText('Render 2')).toBeTruthy();
    });
  });
});