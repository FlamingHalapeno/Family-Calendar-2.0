import { supabase } from '../lib/supabase';
import { CalendarEvent, EventFormData } from '../types';
import { ExternalCalendarService } from './external-calendar-service';

export class EventService {
  static async getEvents(familyId?: string): Promise<CalendarEvent[]> {
    try {
      let query = supabase
        .from('events')
        .select('*')
        .order('start_date', { ascending: true });

      if (familyId) {
        query = query.eq('family_id', familyId);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching events:', error);
      throw error;
    }
  }

  static async createEvent(eventData: EventFormData): Promise<CalendarEvent> {
    try {
      // Check if this event should be created in an external calendar
      if (eventData.linked_calendar_id) {
        return await ExternalCalendarService.createExternalEvent(eventData);
      } else {
        // Create local event directly in Supabase
        const { data, error } = await supabase
          .from('events')
          .insert([eventData])
          .select()
          .single();

        if (error) throw error;
        return data;
      }
    } catch (error) {
      console.error('Error creating event:', error);
      throw error;
    }
  }

  static async updateEvent(id: string, updates: Partial<EventFormData>): Promise<CalendarEvent> {
    try {
      // First, get the current event to check if it's linked to an external calendar
      const { data: currentEvent, error: fetchError } = await supabase
        .from('events')
        .select('*')
        .eq('id', id)
        .single();

      if (fetchError) throw fetchError;

      // If the event has an external_event_id, we need to update the external calendar too
      if (currentEvent.external_event_id && currentEvent.linked_calendar_id) {
        try {
          await ExternalCalendarService.updateExternalEvent(id, updates);
        } catch (error) {
          console.warn('External event update failed, updating locally only:', error);
        }
      }

      const { data, error } = await supabase
        .from('events')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error updating event:', error);
      throw error;
    }
  }

  static async deleteEvent(id: string): Promise<void> {
    try {
      // First, get the current event to check if it's linked to an external calendar
      const { data: currentEvent, error: fetchError } = await supabase
        .from('events')
        .select('*')
        .eq('id', id)
        .single();

      if (fetchError) throw fetchError;

      // If the event has an external_event_id, we need to delete from external calendar too
      if (currentEvent.external_event_id && currentEvent.linked_calendar_id) {
        try {
          await ExternalCalendarService.deleteExternalEvent(id);
        } catch (error) {
          console.warn('External event deletion failed, deleting locally only:', error);
        }
      }

      const { error } = await supabase
        .from('events')
        .delete()
        .eq('id', id);

      if (error) throw error;
    } catch (error) {
      console.error('Error deleting event:', error);
      throw error;
    }
  }

  static async getEventsByDateRange(startDate: string, endDate: string, familyId?: string): Promise<CalendarEvent[]> {
    try {
      let query = supabase
        .from('events')
        .select('*')
        .gte('start_date', startDate)
        .lte('end_date', endDate)
        .order('start_date', { ascending: true });

      if (familyId) {
        query = query.eq('family_id', familyId);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching events by date range:', error);
      throw error;
    }
  }

  /**
   * Fetch events from an external calendar via Edge Function
   */
  static async fetchExternalEvents(
    linkedCalendarId: string, 
    timeMin?: string, 
    timeMax?: string
  ): Promise<CalendarEvent[]> {
    return ExternalCalendarService.fetchExternalEvents(linkedCalendarId, timeMin, timeMax);
  }

  /**
   * Combine local and external events, removing duplicates
   */
  static async getAllEvents(
    familyId?: string, 
    linkedCalendarIds: string[] = [],
    timeMin?: string,
    timeMax?: string
  ): Promise<CalendarEvent[]> {
    try {
      // Fetch local events
      const localEvents = familyId 
        ? await this.getEventsByDateRange(timeMin || '', timeMax || '', familyId)
        : await this.getEvents(familyId);

      // Fetch external events from all linked calendars
      const externalEventsPromises = linkedCalendarIds.map(calendarId =>
        this.fetchExternalEvents(calendarId, timeMin, timeMax)
      );

      const externalEventsArrays = await Promise.allSettled(externalEventsPromises);
      
      // Flatten external events and filter out failed requests
      const externalEvents = externalEventsArrays
        .filter((result): result is PromiseFulfilledResult<CalendarEvent[]> => 
          result.status === 'fulfilled'
        )
        .flatMap(result => result.value);

      // Combine all events
      const allEvents = [...localEvents, ...externalEvents];

      // Remove duplicates based on external_event_id
      const uniqueEvents = allEvents.filter((event, index, array) => {
        if (!event.external_event_id) return true; // Keep local events
        
        // For external events, keep only the first occurrence
        return array.findIndex(e => e.external_event_id === event.external_event_id) === index;
      });

      // Sort by start date
      return uniqueEvents.sort((a, b) => 
        new Date(a.start_date).getTime() - new Date(b.start_date).getTime()
      );

    } catch (error) {
      console.error('Error fetching all events:', error);
      throw error;
    }
  }

  /**
   * Get sync status for linked calendars
   */
  static async getSyncStatus(linkedCalendarIds: string[]): Promise<Record<string, boolean>> {
    return ExternalCalendarService.getSyncStatus(linkedCalendarIds);
  }

  /**
   * Check if an event is external
   */
  static isExternalEvent(event: CalendarEvent): boolean {
    return ExternalCalendarService.isExternalEvent(event);
  }

  /**
   * Check if an event is read-only
   */
  static isReadOnlyEvent(event: CalendarEvent): boolean {
    return ExternalCalendarService.isReadOnlyEvent(event);
  }

  /**
   * Get external link for an event
   */
  static getExternalLink(event: CalendarEvent): string | null {
    return ExternalCalendarService.getExternalLink(event);
  }
} 