import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { CalendarEvent, CalendarView, EventFormData } from '../types';
import { EventService } from '../services/event-service';

export function useCalendar(familyId?: string) {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [currentView, setCurrentView] = useState<CalendarView>('month');
  const queryClient = useQueryClient();

  // Fetch events
  const { data: events = [], isLoading, error } = useQuery({
    queryKey: ['events', familyId],
    queryFn: () => EventService.getEvents(familyId),
  });

  // Create event mutation
  const createEventMutation = useMutation({
    mutationFn: EventService.createEvent,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events', familyId] });
    },
  });

  // Update event mutation
  const updateEventMutation = useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<EventFormData> }) =>
      EventService.updateEvent(id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events', familyId] });
    },
  });

  // Delete event mutation
  const deleteEventMutation = useMutation({
    mutationFn: EventService.deleteEvent,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events', familyId] });
    },
  });

  // Helper functions
  const getEventsForDate = (date: Date): CalendarEvent[] => {
    const targetDate = date.toISOString().split('T')[0];
    return events.filter(event => {
      const eventStart = new Date(event.start_date).toISOString().split('T')[0];
      const eventEnd = new Date(event.end_date).toISOString().split('T')[0];
      return targetDate >= eventStart && targetDate <= eventEnd;
    });
  };

  const getEventsForDateRange = (startDate: Date, endDate: Date): CalendarEvent[] => {
    return events.filter(event => {
      const eventStart = new Date(event.start_date);
      const eventEnd = new Date(event.end_date);
      return eventStart <= endDate && eventEnd >= startDate;
    });
  };

  const navigateDate = (direction: 'prev' | 'next') => {
    const newDate = new Date(selectedDate);
    
    switch (currentView) {
      case 'day':
        newDate.setDate(newDate.getDate() + (direction === 'next' ? 1 : -1));
        break;
      case 'week':
        newDate.setDate(newDate.getDate() + (direction === 'next' ? 7 : -7));
        break;
      case 'month':
        newDate.setMonth(newDate.getMonth() + (direction === 'next' ? 1 : -1));
        break;
    }
    
    setSelectedDate(newDate);
  };

  const createEvent = (eventData: EventFormData) => {
    return createEventMutation.mutateAsync(eventData);
  };

  const updateEvent = (id: string, updates: Partial<EventFormData>) => {
    return updateEventMutation.mutateAsync({ id, updates });
  };

  const deleteEvent = (id: string) => {
    return deleteEventMutation.mutateAsync(id);
  };

  return {
    // State
    events,
    selectedDate,
    currentView,
    isLoading,
    error,
    
    // Actions
    setSelectedDate,
    setCurrentView,
    navigateDate,
    createEvent,
    updateEvent,
    deleteEvent,
    
    // Helpers
    getEventsForDate,
    getEventsForDateRange,
    
    // Loading states
    isCreating: createEventMutation.isPending,
    isUpdating: updateEventMutation.isPending,
    isDeleting: deleteEventMutation.isPending,
  };
} 