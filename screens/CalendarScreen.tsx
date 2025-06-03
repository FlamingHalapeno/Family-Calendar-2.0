import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Calendar } from '../components/Calendar';

export function CalendarScreen() {
  return (
    <View style={styles.container}>
      <Calendar />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
}); 