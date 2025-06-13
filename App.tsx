import React from 'react';
import 'react-native-gesture-handler';
import { QueryProvider } from './providers/QueryProvider';
import { AuthProvider } from './providers/AuthProvider';
import { AppNavigator } from './navigation/AppNavigator';
import { ErrorBoundary } from './components/ErrorBoundary';

export default function App() {
  return (
    <ErrorBoundary>
      <QueryProvider>
        <AuthProvider>
          <AppNavigator />
        </AuthProvider>
      </QueryProvider>
    </ErrorBoundary>
  );
}