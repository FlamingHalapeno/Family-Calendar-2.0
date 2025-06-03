import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, Dimensions } from 'react-native';
import { CalendarEvent } from '../../types';

interface MonthViewProps {
  selectedDate: Date;
  events: CalendarEvent[];
  onDatePress?: (date: Date) => void;
  onEventPress?: (event: CalendarEvent) => void;
  userColors?: Record<string, string>;
}

export function MonthView({ selectedDate, events, onDatePress, onEventPress, userColors }: MonthViewProps) {
  const { width: windowWidth } = Dimensions.get('window');
  const cellWidth = (windowWidth - 32) / 7; // 32 for left/right padding

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startOfWeek = new Date(firstDay);
    startOfWeek.setDate(firstDay.getDate() - firstDay.getDay());
    
    const days: Date[] = [];
    const current = new Date(startOfWeek);
    
    // Generate 6 weeks (42 days) to ensure full month display
    for (let i = 0; i < 42; i++) {
      days.push(new Date(current));
      current.setDate(current.getDate() + 1);
    }
    
    return { days, firstDay, lastDay };
  };

  const getEventsForDate = (date: Date): CalendarEvent[] => {
    const targetDate = date.toISOString().split('T')[0];
    return events.filter(event => {
      const eventStart = new Date(event.start_date).toISOString().split('T')[0];
      const eventEnd = new Date(event.end_date).toISOString().split('T')[0];
      return targetDate >= eventStart && targetDate <= eventEnd;
    });
  };

  const isToday = (date: Date) => {
    const today = new Date();
    return date.toDateString() === today.toDateString();
  };

  const isSameMonth = (date: Date, referenceDate: Date) => {
    return date.getMonth() === referenceDate.getMonth() && 
           date.getFullYear() === referenceDate.getFullYear();
  };

  const getUserColor = (userId?: string) => {
    return userId && userColors ? userColors[userId] : '#007AFF';
  };

  const { days, firstDay, lastDay } = getDaysInMonth(selectedDate);

  const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return (
    <View style={styles.container}>
      {/* Week headers */}
      <View style={styles.weekHeader}>
        {weekDays.map((day) => (
          <View key={day} style={[styles.weekDay, { width: cellWidth }]}>
            <Text style={styles.weekDayText}>{day}</Text>
          </View>
        ))}
      </View>

      {/* Calendar grid */}
      <View style={styles.calendarGrid}>
        <View style={styles.weeksContainer}>
          {Array.from({ length: 6 }, (_, weekIndex) => (
            <View key={weekIndex} style={styles.week}>
              {days.slice(weekIndex * 7, (weekIndex + 1) * 7).map((date, dayIndex) => {
                const dayEvents = getEventsForDate(date);
                const isCurrentMonth = isSameMonth(date, selectedDate);
                const isCurrentDay = isToday(date);
                
                return (
                  <TouchableOpacity
                    key={dayIndex}
                    style={[
                      styles.dayCell,
                      { width: cellWidth },
                      isCurrentDay && styles.todayCell,
                    ]}
                    onPress={() => onDatePress?.(date)}
                    activeOpacity={0.7}
                  >
                    <Text style={[
                      styles.dayNumber,
                      isCurrentDay && styles.todayText,
                      !isCurrentMonth && styles.otherMonthText,
                    ]}>
                      {date.getDate()}
                    </Text>
                    
                    {/* Event indicators */}
                    {dayEvents.length > 0 && (
                      <View style={styles.eventIndicators}>
                        {dayEvents.slice(0, 2).map((event, index) => (
                          <TouchableOpacity
                            key={event.id}
                            style={[
                              styles.eventDot,
                              { backgroundColor: getUserColor(event.user_id) }
                            ]}
                            onPress={() => onEventPress?.(event)}
                          />
                        ))}
                        {dayEvents.length > 2 && (
                          <View style={styles.moreEventsDot}>
                            <Text style={styles.moreEventsText}>+{dayEvents.length - 2}</Text>
                          </View>
                        )}
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          ))}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  weekHeader: {
    flexDirection: 'row',
    backgroundColor: '#F5F5F5',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  weekDay: {
    alignItems: 'center',
  },
  weekDayText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    textTransform: 'capitalize',
  },
  calendarGrid: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  weeksContainer: {
    flex: 1,
    paddingHorizontal: 16,
  },
  week: {
    flex: 1,
    flexDirection: 'row',
    marginBottom: 1,
  },
  dayCell: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'flex-start',
    marginRight: 1,
    borderRadius: 0,
    position: 'relative',
    minHeight: 70,
    paddingTop: 10,
  },
  todayCell: {
    backgroundColor: '#007AFF',
  },
  dayNumber: {
    fontSize: 24,
    fontWeight: '500',
    color: '#000000',
  },
  todayText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  otherMonthText: {
    color: '#C7C7CC',
  },
  eventIndicators: {
    position: 'absolute',
    bottom: 6,
    flexDirection: 'row',
    alignItems: 'center',
  },
  eventDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginHorizontal: 1,
  },
  moreEventsDot: {
    backgroundColor: '#8E8E93',
    borderRadius: 8,
    paddingHorizontal: 4,
    paddingVertical: 2,
    marginLeft: 2,
  },
  moreEventsText: {
    fontSize: 10,
    color: '#FFFFFF',
    fontWeight: '600',
  },
}); 