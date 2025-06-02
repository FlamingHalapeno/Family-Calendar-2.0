import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { Database } from '../lib/database.types';

type Tables = Database['public']['Tables'];
type EventRow = Tables['events']['Row'];
type EventInsert = Tables['events']['Insert'];
type EventUpdate = Tables['events']['Update'];

// Custom hook for fetching events
export function useEvents(userId?: string) {
  return useQuery({
    queryKey: ['events', userId],
    queryFn: async () => {
      let query = supabase.from('events').select('*');
      
      if (userId) {
        query = query.eq('user_id', userId);
      }
      
      const { data, error } = await query.order('start_date', { ascending: true });
      
      if (error) throw error;
      return data as EventRow[];
    },
    enabled: !!userId, // Only run query if userId is provided
  });
}

// Custom hook for creating events
export function useCreateEvent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (newEvent: EventInsert) => {
      const { data, error } = await supabase
        .from('events')
        .insert(newEvent)
        .select()
        .single();
      
      if (error) throw error;
      return data as EventRow;
    },
    onSuccess: () => {
      // Invalidate and refetch events
      queryClient.invalidateQueries({ queryKey: ['events'] });
    },
  });
}

// Custom hook for updating events
export function useUpdateEvent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: EventUpdate }) => {
      const { data, error } = await supabase
        .from('events')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data as EventRow;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events'] });
    },
  });
}

// Custom hook for deleting events
export function useDeleteEvent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('events')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events'] });
    },
  });
}

// Generic database hook for any table
export function useSupabaseQuery<T>(
  table: string,
  select: string = '*',
  filters?: Record<string, any>
) {
  return useQuery({
    queryKey: [table, select, filters],
    queryFn: async () => {
      let query = supabase.from(table).select(select);
      
      if (filters) {
        Object.entries(filters).forEach(([key, value]) => {
          query = query.eq(key, value);
        });
      }
      
      const { data, error } = await query;
      
      if (error) throw error;
      return data as T[];
    },
  });
} 