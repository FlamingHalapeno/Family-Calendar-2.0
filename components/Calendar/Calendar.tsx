import React, { useState, useRef, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, Animated, Easing } from 'react-native';
import { CalendarEvent } from '../../types';
import { useCalendar } from '../../hooks/useCalendar';
import { CalendarHeader } from './CalendarHeader';
import { DayView } from './DayView';
import { WeekView } from './WeekView';
import { MonthView } from './MonthView';
import { EventModal } from './EventModal';

interface CalendarProps {
  familyId?: string;
  userColors?: Record<string, string>;
}

export function Calendar({ familyId, userColors }: CalendarProps) {
  const {
    events,
    selectedDate,
    currentView,
    isLoading,
    setSelectedDate,
    setCurrentView,
    navigateDate,
    createEvent,
    updateEvent,
    deleteEvent,
    getEventsForDate,
    getEventsForDateRange,
  } = useCalendar(familyId);

  const [isEventModalVisible, setIsEventModalVisible] = useState(false);
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | undefined>();
  const [modalInitialDate, setModalInitialDate] = useState<Date | undefined>();
  const [previousView, setPreviousView] = useState<'week' | 'month'>('month');
  
  // Animation values
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const slideAnim = useRef(new Animated.Value(0)).current;

  // Animate view transitions
  const animateViewChange = (callback: () => void) => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 120,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 8,
        duration: 120,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
    ]).start(() => {
      callback();
      // Small delay to ensure view is rendered
      setTimeout(() => {
        Animated.parallel([
          Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 180,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
          }),
          Animated.timing(slideAnim, {
            toValue: 0,
            duration: 180,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
          }),
        ]).start();
      }, 16); // One frame delay
    });
  };

  const handleDatePress = (date: Date) => {
    // Remember the current view before switching to day view
    if (currentView !== 'day') {
      setPreviousView(currentView as 'week' | 'month');
    }
    setSelectedDate(date);
    if (currentView !== 'day') {
      animateViewChange(() => setCurrentView('day'));
    }
  };

  const handleEventPress = (event: CalendarEvent) => {
    Alert.alert(
      event.title,
      event.description || 'No description',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Edit', 
          onPress: () => {
            setEditingEvent(event);
            setIsEventModalVisible(true);
          }
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => handleDeleteEvent(event.id),
        }
      ]
    );
  };

  const handleDeleteEvent = async (eventId: string) => {
    Alert.alert(
      'Delete Event',
      'Are you sure you want to delete this event?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteEvent(eventId);
            } catch (error) {
              Alert.alert('Error', 'Failed to delete event');
            }
          }
        }
      ]
    );
  };

  const handleAddEvent = (initialDate?: Date) => {
    setEditingEvent(undefined);
    setModalInitialDate(initialDate || selectedDate);
    setIsEventModalVisible(true);
  };

  const handleSaveEvent = async (eventData: any) => {
    try {
      if (editingEvent) {
        await updateEvent(editingEvent.id, eventData);
      } else {
        await createEvent(eventData);
      }
    } catch (error) {
      throw error; // Re-throw to let modal handle the error
    }
  };

  const handleTodayPress = () => {
    setSelectedDate(new Date());
  };

  const handleViewToggle = () => {
    if (currentView === 'day') {
      // Return to the previous view
      animateViewChange(() => setCurrentView(previousView));
    } else {
      // Toggle between week and month, and update previousView
      const newView = currentView === 'week' ? 'month' : 'week';
      setPreviousView(currentView as 'week' | 'month');
      animateViewChange(() => setCurrentView(newView));
    }
  };

  const getCurrentViewEvents = () => {
    switch (currentView) {
      case 'day':
        return getEventsForDate(selectedDate);
      case 'week':
        const weekStart = new Date(selectedDate);
        weekStart.setDate(selectedDate.getDate() - selectedDate.getDay());
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekStart.getDate() + 6);
        return getEventsForDateRange(weekStart, weekEnd);
      case 'month':
        const monthStart = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1);
        const monthEnd = new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1, 0);
        return getEventsForDateRange(monthStart, monthEnd);
      default:
        return events;
    }
  };

  const renderCurrentView = () => {
    const viewEvents = getCurrentViewEvents();

    switch (currentView) {
      case 'day':
        return (
          <DayView
            selectedDate={selectedDate}
            events={viewEvents}
            onEventPress={handleEventPress}
            userColors={userColors}
          />
        );
      case 'week':
        return (
          <WeekView
            selectedDate={selectedDate}
            events={viewEvents}
            onDatePress={handleDatePress}
            onEventPress={handleEventPress}
            userColors={userColors}
          />
        );
      case 'month':
        return (
          <MonthView
            selectedDate={selectedDate}
            events={viewEvents}
            onDatePress={handleDatePress}
            onEventPress={handleEventPress}
            userColors={userColors}
          />
        );
      default:
        return null;
    }
  };

  return (
    <View style={styles.container}>
      <CalendarHeader
        selectedDate={selectedDate}
        currentView={currentView}
        onNavigate={navigateDate}
        onViewChange={handleViewToggle}
        onTodayPress={handleTodayPress}
        previousView={previousView}
      />
      
      <Animated.View 
        style={[
          styles.content,
          {
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }],
          },
        ]}
      >
        {renderCurrentView()}
      </Animated.View>

      {/* Floating Add Button */}
      <TouchableOpacity
        style={styles.addButton}
        onPress={() => handleAddEvent()}
        activeOpacity={0.8}
      >
        <View style={styles.addButtonContent}>
          <Text style={styles.addButtonText}>+</Text>
        </View>
      </TouchableOpacity>

      {/* Event Modal */}
      <EventModal
        visible={isEventModalVisible}
        onClose={() => {
          setIsEventModalVisible(false);
          setEditingEvent(undefined);
          setModalInitialDate(undefined);
        }}
        onSave={handleSaveEvent}
        initialDate={modalInitialDate}
        editingEvent={editingEvent}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  content: {
    flex: 1,
  },
  addButton: {
    position: 'absolute',
    right: 20,
    bottom: 34,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#007AFF',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.25,
    shadowRadius: 12,
  },
  addButtonContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addButtonText: {
    fontSize: 24,
    color: '#FFFFFF',
    fontWeight: '300',
  },
}); 