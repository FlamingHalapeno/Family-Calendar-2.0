import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export function TasksScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Tasks & To-Do</Text>
      <Text style={styles.subtitle}>Task management functionality coming soon...</Text>
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