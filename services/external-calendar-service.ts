import { supabase } from '../lib/supabase';
import { CalendarEvent, EventFormData, ExternalCalendarEvent } from '../types';

export class ExternalCalendarService {
  /**
   * Create an event in an external calendar via Edge Function
   */
  static async createExternalEvent(eventData: EventFormData): Promise<CalendarEvent> {
    if (!eventData.linked_calendar_id) {
      throw new Error('linked_calendar_id is required for external events');
    }

    const { data, error } = await supabase.functions.invoke('create-external-event', {
      body: { eventData },
    });

    if (error) {
      console.error('Edge function error:', error);
      throw new Error(`Failed to invoke external event creation: ${error.message}`);
    }
    
    if (!data.success) {
      throw new Error(data.error || 'Failed to create external event');
    }

    return data.event;
  }

  /**
   * Fetch events from an external calendar via Edge Function
   */
  static async fetchExternalEvents(
    linkedCalendarId: string, 
    timeMin?: string, 
    timeMax?: string
  ): Promise<ExternalCalendarEvent[]> {
    try {
      const { data, error } = await supabase.functions.invoke('fetch-external-events', {
        body: { 
          linked_calendar_id: linkedCalendarId,
          time_min: timeMin,
          time_max: timeMax,
        },
      });

      if (error) {
        console.error('Edge function error:', error);
        throw new Error(`Failed to invoke external event fetch: ${error.message}`);
      }
      
      if (!data.success) {
        throw new Error(data.error || 'Failed to fetch external events');
      }

      return data.events;
    } catch (error) {
      console.error('Error fetching external events:', error);
      // Return empty array instead of throwing to allow app to continue with local events
      return [];
    }
  }

  /**
   * Update an event in an external calendar via Edge Function
   * TODO: Implement when update-external-event Edge Function is created
   */
  static async updateExternalEvent(
    eventId: string, 
    updates: Partial<EventFormData>
  ): Promise<CalendarEvent> {
    // Placeholder for future implementation
    throw new Error('External event updates not yet implemented');
  }

  /**
   * Delete an event from an external calendar via Edge Function
   * TODO: Implement when delete-external-event Edge Function is created
   */
  static async deleteExternalEvent(eventId: string): Promise<void> {
    // Placeholder for future implementation
    throw new Error('External event deletion not yet implemented');
  }

  /**
   * Check if an event is external (has external metadata)
   */
  static isExternalEvent(event: CalendarEvent): event is ExternalCalendarEvent {
    return !!(event as ExternalCalendarEvent)._isExternal;
  }

  /**
   * Check if an event is read-only (from external calendar)
   */
  static isReadOnlyEvent(event: CalendarEvent): boolean {
    return this.isExternalEvent(event) && !!event._readOnly;
  }

  /**
   * Get the external link for an event (if available)
   */
  static getExternalLink(event: CalendarEvent): string | null {
    if (this.isExternalEvent(event)) {
      return event._htmlLink || null;
    }
    return null;
  }

  /**
   * Format event data for external calendar APIs
   */
  static formatEventForExternal(eventData: EventFormData, provider: string) {
    const isAllDay = this.isAllDayEvent(eventData.start_date, eventData.end_date);

    switch (provider) {
      case 'google':
        return this.formatForGoogle(eventData, isAllDay);
      default:
        throw new Error(`Unsupported provider: ${provider}`);
    }
  }

  /**
   * Check if an event is all-day based on start and end times
   */
  private static isAllDayEvent(startDate: string, endDate: string): boolean {
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    return start.getHours() === 0 && start.getMinutes() === 0 &&
           end.getHours() === 23 && end.getMinutes() === 59;
  }

  /**
   * Format event data for Google Calendar API
   */
  private static formatForGoogle(eventData: EventFormData, isAllDay: boolean) {
    const startDate = new Date(eventData.start_date);
    const endDate = new Date(eventData.end_date);

    return {
      summary: eventData.title,
      description: eventData.description,
      start: isAllDay 
        ? { date: startDate.toISOString().split('T')[0] }
        : { dateTime: eventData.start_date, timeZone: 'UTC' },
      end: isAllDay
        ? { date: new Date(endDate.getTime() + 24 * 60 * 60 * 1000).toISOString().split('T')[0] }
        : { dateTime: eventData.end_date, timeZone: 'UTC' },
    };
  }

  /**
   * Get sync status for linked calendars
   */
  static async getSyncStatus(linkedCalendarIds: string[]): Promise<Record<string, boolean>> {
    const status: Record<string, boolean> = {};

    for (const calendarId of linkedCalendarIds) {
      try {
        // Try to fetch a small number of events to test connectivity
        await this.fetchExternalEvents(calendarId, 
          new Date().toISOString(), 
          new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() // Next 24 hours
        );
        status[calendarId] = true;
      } catch (error) {
        console.error(`Sync test failed for calendar ${calendarId}:`, error);
        status[calendarId] = false;
      }
    }

    return status;
  }
} 