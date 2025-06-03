import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { CalendarEvent } from '../../types';

interface EventCardProps {
  event: CalendarEvent;
  onPress?: (event: CalendarEvent) => void;
  compact?: boolean;
  userColor?: string;
}

export function EventCard({ event, onPress, compact = false, userColor }: EventCardProps) {
  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const isAllDay = () => {
    const start = new Date(event.start_date);
    const end = new Date(event.end_date);
    
    // Check if it's a full day event (starts at 00:00 and ends at 23:59 or next day 00:00)
    return start.getHours() === 0 && start.getMinutes() === 0 && 
           (end.getHours() === 23 && end.getMinutes() === 59 || 
            (end.getHours() === 0 && end.getMinutes() === 0));
  };

  const getEventColor = () => {
    return event.color || userColor || '#007AFF';
  };

  const isMultiDay = () => {
    const start = new Date(event.start_date);
    const end = new Date(event.end_date);
    return start.toDateString() !== end.toDateString();
  };

  return (
    <TouchableOpacity
      style={[
        styles.container,
        compact && styles.compactContainer,
        { borderLeftColor: getEventColor() }
      ]}
      onPress={() => onPress?.(event)}
      activeOpacity={0.7}
    >
      <View style={styles.content}>
        <Text style={[styles.title, compact && styles.compactTitle]} numberOfLines={compact ? 1 : 2}>
          {event.title}
        </Text>
        
        {!compact && (
          <>
            {event.description && (
              <Text style={styles.description} numberOfLines={2}>
                {event.description}
              </Text>
            )}
            
            <View style={styles.timeContainer}>
              {isAllDay() ? (
                <Text style={styles.timeText}>All day</Text>
              ) : (
                <Text style={styles.timeText}>
                  {formatTime(event.start_date)}
                  {isMultiDay() && ` - ${formatTime(event.end_date)}`}
                </Text>
              )}
              
              {isMultiDay() && (
                <Text style={styles.multiDayText}>Multi-day</Text>
              )}
            </View>
          </>
        )}
        
        {compact && !isAllDay() && (
          <Text style={styles.compactTime}>
            {formatTime(event.start_date)}
          </Text>
        )}
      </View>
      
      <View style={[styles.colorBar, { backgroundColor: getEventColor() }]} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    borderRadius: 8,
    borderLeftWidth: 4,
    marginVertical: 2,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  compactContainer: {
    marginVertical: 1,
    shadowOpacity: 0.05,
    elevation: 1,
  },
  content: {
    padding: 12,
    paddingRight: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  compactTitle: {
    fontSize: 16,
    marginBottom: 2,
  },
  description: {
    fontSize: 16,
    color: '#666',
    marginBottom: 8,
    lineHeight: 20,
  },
  timeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  timeText: {
    fontSize: 14,
    color: '#888',
    fontWeight: '500',
  },
  compactTime: {
    fontSize: 13,
    color: '#888',
  },
  multiDayText: {
    fontSize: 12,
    color: '#007AFF',
    fontWeight: '500',
    backgroundColor: '#E3F2FD',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  colorBar: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    width: 3,
    borderTopRightRadius: 8,
    borderBottomRightRadius: 8,
  },
}); 