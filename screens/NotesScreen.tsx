import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export function NotesScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Notes</Text>
      <Text style={styles.subtitle}>Note-taking functionality coming soon...</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  title: {
    fontSize: 22,
    fontWeight: '600',
    marginBottom: 12,
    color: '#000000',
  },
  subtitle: {
    fontSize: 15,
    color: '#8E8E93',
    textAlign: 'center',
    fontWeight: '400',
  },
}); 