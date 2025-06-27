import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { CalendarEvent, CalendarView, EventFormData } from '../types';
import { EventService } from '../services/event-service';
import { useLinkedCalendars } from './useLinkedCalendars';
import { useAuth } from './use-auth';

export function useCalendar(familyId?: string) {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [currentView, setCurrentView] = useState<CalendarView>('month');
  const queryClient = useQueryClient();
  const { user } = useAuth();

  // Get user's linked calendars to fetch external events
  const { data: linkedCalendars = [] } = useLinkedCalendars(user?.id);

  // Calculate date range for external event fetching based on current view
  const getDateRange = () => {
    const now = new Date();
    const currentMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const nextMonth = new Date(now.getFullYear(), now.getMonth() + 2, 0); // End of next month
    
    return {
      timeMin: currentMonth.toISOString(),
      timeMax: nextMonth.toISOString(),
    };
  };

  // Fetch local events
  const { data: localEvents = [], isLoading: localEventsLoading, error: localEventsError } = useQuery({
    queryKey: ['local-events', familyId],
    queryFn: () => EventService.getEvents(familyId),
  });

  // Fetch external events for each linked calendar
  const linkedCalendarIds = linkedCalendars.map(cal => cal.id);
  const { timeMin, timeMax } = getDateRange();

  const externalEventQueries = linkedCalendarIds.map(calendarId => 
    useQuery({
      queryKey: ['external-events', calendarId, timeMin, timeMax],
      queryFn: () => EventService.fetchExternalEvents(calendarId, timeMin, timeMax),
      enabled: !!calendarId,
      retry: 1, // Only retry once for external events
      staleTime: 5 * 60 * 1000, // Cache for 5 minutes
    })
  );

  // Combine all events
  const { data: allEvents = [], isLoading, error } = useQuery({
    queryKey: ['all-events', familyId, linkedCalendarIds, timeMin, timeMax],
    queryFn: async () => {
      try {
        // Get all external events from the queries
        const externalEvents = externalEventQueries
          .filter(query => query.data)
          .flatMap(query => query.data || []);

        // Combine local and external events
        const combined = [...localEvents, ...externalEvents];

        // Remove duplicates based on external_event_id
        const uniqueEvents = combined.filter((event, index, array) => {
          if (!event.external_event_id) return true; // Keep local events
          
          // For external events, keep only the first occurrence
          return array.findIndex(e => e.external_event_id === event.external_event_id) === index;
        });

        // Sort by start date
        return uniqueEvents.sort((a, b) => 
          new Date(a.start_date).getTime() - new Date(b.start_date).getTime()
        );
      } catch (error) {
        console.error('Error combining events:', error);
        return localEvents; // Fallback to local events only
      }
    },
    enabled: !localEventsLoading && externalEventQueries.every(query => !query.isLoading),
  });

  // Create event mutation
  const createEventMutation = useMutation({
    mutationFn: EventService.createEvent,
    onSuccess: () => {
      // Invalidate both local and external events
      queryClient.invalidateQueries({ queryKey: ['local-events', familyId] });
      queryClient.invalidateQueries({ queryKey: ['all-events'] });
      
      // If creating an external event, also invalidate that specific calendar's events
      queryClient.invalidateQueries({ queryKey: ['external-events'] });
    },
  });

  // Update event mutation
  const updateEventMutation = useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<EventFormData> }) =>
      EventService.updateEvent(id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['local-events', familyId] });
      queryClient.invalidateQueries({ queryKey: ['all-events'] });
      queryClient.invalidateQueries({ queryKey: ['external-events'] });
    },
  });

  // Delete event mutation
  const deleteEventMutation = useMutation({
    mutationFn: EventService.deleteEvent,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['local-events', familyId] });
      queryClient.invalidateQueries({ queryKey: ['all-events'] });
      queryClient.invalidateQueries({ queryKey: ['external-events'] });
    },
  });

  // Helper functions
  const getEventsForDate = (date: Date): CalendarEvent[] => {
    const targetDate = date.toISOString().split('T')[0];
    return allEvents.filter(event => {
      const eventStart = new Date(event.start_date).toISOString().split('T')[0];
      const eventEnd = new Date(event.end_date).toISOString().split('T')[0];
      return targetDate >= eventStart && targetDate <= eventEnd;
    });
  };

  const getEventsForDateRange = (startDate: Date, endDate: Date): CalendarEvent[] => {
    return allEvents.filter(event => {
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

  // Force refresh external events
  const refreshExternalEvents = () => {
    linkedCalendarIds.forEach(calendarId => {
      queryClient.invalidateQueries({ queryKey: ['external-events', calendarId] });
    });
    queryClient.invalidateQueries({ queryKey: ['all-events'] });
  };

  // Get sync status for linked calendars
  const getSyncStatus = () => {
    if (linkedCalendarIds.length === 0) return {};
    return EventService.getSyncStatus(linkedCalendarIds);
  };

  return {
    // State
    events: allEvents,
    localEvents,
    selectedDate,
    currentView,
    isLoading: isLoading || localEventsLoading,
    error: error || localEventsError,
    
    // External event status
    externalEventStatus: externalEventQueries.map(query => ({
      isLoading: query.isLoading,
      error: query.error,
      data: query.data,
    })),
    
    // Actions
    setSelectedDate,
    setCurrentView,
    navigateDate,
    createEvent,
    updateEvent,
    deleteEvent,
    refreshExternalEvents,
    getSyncStatus,
    
    // Helpers
    getEventsForDate,
    getEventsForDateRange,
    
    // Event utilities
    isExternalEvent: EventService.isExternalEvent,
    isReadOnlyEvent: EventService.isReadOnlyEvent,
    getExternalLink: EventService.getExternalLink,
    
    // Loading states
    isCreating: createEventMutation.isPending,
    isUpdating: updateEventMutation.isPending,
    isDeleting: deleteEventMutation.isPending,
    
    // Calendar info
    linkedCalendars,
  };
} 