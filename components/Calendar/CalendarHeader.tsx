import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { CalendarView } from '../../types';

interface CalendarHeaderProps {
  selectedDate: Date;
  currentView: CalendarView;
  onNavigate: (direction: 'prev' | 'next') => void;
  onViewChange: () => void;
  onTodayPress: () => void;
  previousView: 'week' | 'month';
}

export function CalendarHeader({ selectedDate, currentView, onNavigate, onViewChange, onTodayPress, previousView }: CalendarHeaderProps) {
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const formatTitle = () => {
    const options: Intl.DateTimeFormatOptions = {};
    
    switch (currentView) {
      case 'day':
        options.weekday = 'long';
        options.year = 'numeric';
        options.month = 'long';
        options.day = 'numeric';
        break;
      case 'week':
        options.year = 'numeric';
        options.month = 'long';
        options.day = 'numeric';
        break;
      case 'month':
        options.year = 'numeric';
        options.month = 'long';
        break;
    }
    
    return selectedDate.toLocaleDateString(undefined, options);
  };

  const getCurrentTime = () => {
    return currentTime.toLocaleTimeString([], { 
      hour: 'numeric', 
      minute: '2-digit',
      hour12: true 
    });
  };

  const getViewToggleText = () => {
    if (currentView === 'day') {
      return previousView === 'week' ? 'Week' : 'Month';
    }
    return currentView === 'week' ? 'Month' : 'Week';
  };

  return (
    <View style={styles.container}>
      <View style={styles.mainRow}>
        <View style={styles.navigationGroup}>
          <TouchableOpacity 
            style={styles.navButton} 
            onPress={() => onNavigate('prev')}
          >
            <Text style={styles.navButtonText}>‹</Text>
          </TouchableOpacity>
          
          <Text style={styles.title}>{formatTitle()}</Text>
          
          <TouchableOpacity 
            style={styles.navButton} 
            onPress={() => onNavigate('next')}
          >
            <Text style={styles.navButtonText}>›</Text>
          </TouchableOpacity>
          
          <Text style={styles.timeDisplay}>{getCurrentTime()}</Text>
        </View>
        
        <View style={styles.viewSelector}>
          <TouchableOpacity
            style={styles.viewToggleButton}
            onPress={onViewChange}
          >
            <Text style={styles.viewToggleText}>
              {getViewToggleText()}
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.todayButton}
            onPress={onTodayPress}
          >
            <Text style={styles.todayButtonText}>Today</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#F5F5F5',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
  },
  mainRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 72,
  },
  navigationGroup: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  navButton: {
    padding: 12,
    minWidth: 56,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 4,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  navButtonText: {
    fontSize: 36,
    color: '#007AFF',
    fontWeight: '600',
    textAlign: 'center',
    lineHeight: 36,
  },
  title: {
    fontSize: 22,
    fontWeight: '600',
    color: '#000000',
    textAlign: 'center',
    marginHorizontal: 8,
    minWidth: 200,
  },
  viewSelector: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  viewToggleButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 18,
    marginLeft: 8,
    height: 48,
    justifyContent: 'center',
  },
  viewToggleText: {
    fontSize: 16,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  todayButton: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 18,
    marginLeft: 8,
    height: 48,
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#007AFF',
  },
  todayButtonText: {
    fontSize: 16,
    color: '#007AFF',
    fontWeight: '600',
  },
  timeDisplay: {
    fontSize: 20,
    color: '#000000',
    fontWeight: '600',
    marginLeft: 12,
  },
}); 