import React from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { CalendarEvent } from '../../types';
import { EventCard } from './EventCard';

interface DayViewProps {
  selectedDate: Date;
  events: CalendarEvent[];
  onEventPress?: (event: CalendarEvent) => void;
  userColors?: Record<string, string>;
}

export function DayView({ selectedDate, events, onEventPress, userColors }: DayViewProps) {
  const formatDate = (date: Date) => {
    return date.toLocaleDateString(undefined, {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const sortedEvents = events.sort((a, b) => {
    const aStart = new Date(a.start_date);
    const bStart = new Date(b.start_date);
    return aStart.getTime() - bStart.getTime();
  });

  const getUserColor = (userId?: string) => {
    return userId && userColors ? userColors[userId] : undefined;
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.dateText}>{formatDate(selectedDate)}</Text>
        <Text style={styles.eventCount}>
          {events.length} {events.length === 1 ? 'event' : 'events'}
        </Text>
      </View>
      
      <ScrollView style={styles.eventsList} showsVerticalScrollIndicator={false}>
        {sortedEvents.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>No events scheduled</Text>
            <Text style={styles.emptySubtext}>Tap + to add a new event</Text>
          </View>
        ) : (
          <View style={styles.eventsContainer}>
            {sortedEvents.map((event) => (
              <EventCard
                key={event.id}
                event={event}
                onPress={onEventPress}
                userColor={getUserColor(event.user_id)}
              />
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  dateText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 2,
  },
  eventCount: {
    fontSize: 14,
    color: '#666',
  },
  eventsList: {
    flex: 1,
  },
  eventsContainer: {
    padding: 16,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    paddingVertical: 64,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '500',
    color: '#666',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
  },
}); 