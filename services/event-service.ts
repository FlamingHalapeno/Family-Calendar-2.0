import { supabase } from '../lib/supabase';
import { CalendarEvent, EventFormData } from '../types';

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
      const { data, error } = await supabase
        .from('events')
        .insert([eventData])
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error creating event:', error);
      throw error;
    }
  }

  static async updateEvent(id: string, updates: Partial<EventFormData>): Promise<CalendarEvent> {
    try {
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
} 