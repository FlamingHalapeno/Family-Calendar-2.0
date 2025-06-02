import React from 'react';
import { StyleSheet, Text, View, SafeAreaView, StatusBar } from 'react-native';
import { QueryProvider } from './providers/QueryProvider';
import { AuthProvider, useAuth } from './providers/AuthProvider';

function AppContent() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" />
        <View style={styles.content}>
          <Text style={styles.title}>Loading...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <View style={styles.content}>
        <Text style={styles.title}>Family Calendar</Text>
        <Text style={styles.subtitle}>
          {user ? `Welcome, ${user.email}!` : 'Ready for development!'}
        </Text>
        <Text style={styles.status}>
          Supabase Status: {user ? 'Connected' : 'Not authenticated'}
        </Text>
      </View>
    </SafeAreaView>
  );
}

export default function App() {
  return (
    <QueryProvider>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </QueryProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 8,
  },
  status: {
    fontSize: 14,
    color: '#999',
  },
}); 