import React from 'react';
import 'react-native-gesture-handler';
import { QueryProvider } from './providers/QueryProvider';
import { AuthProvider } from './providers/AuthProvider';
import { AppNavigator } from './navigation/AppNavigator';

export default function App() {
  return (
    <QueryProvider>
      <AuthProvider>
        <AppNavigator />
      </AuthProvider>
    </QueryProvider>
  );
} 