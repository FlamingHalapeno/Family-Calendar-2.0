import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { useAuth } from './use-auth';
import { LinkedCalendar, CalendarOption } from '../types';

export function useLinkedCalendars(userId?: string) {
  const { user } = useAuth();
  const targetUserId = userId || user?.id;

  return useQuery({
    queryKey: ['linked-calendars', targetUserId],
    queryFn: async (): Promise<LinkedCalendar[]> => {
      if (!targetUserId) {
        throw new Error('User ID is required');
      }

      const { data, error } = await supabase
        .from('linked_calendars')
        .select('*')
        .eq('user_id', targetUserId)
        .order('created_at', { ascending: true });

      if (error) {
        throw error;
      }

      return data || [];
    },
    enabled: !!targetUserId,
  });
}

export function useUserCalendarOptions(userId?: string) {
  const { user } = useAuth();
  const targetUserId = userId || user?.id;
  const { data: linkedCalendars, isLoading } = useLinkedCalendars(targetUserId);

  return useQuery({
    queryKey: ['calendar-options', targetUserId],
    queryFn: async (): Promise<CalendarOption[]> => {
      const options: CalendarOption[] = [];

      // Add default "Family Calendar" option
      options.push({
        id: null,
        name: 'Family Calendar',
        color: '#007AFF',
        isDefault: true,
      });

      // Add linked calendars
      if (linkedCalendars) {
        linkedCalendars.forEach(calendar => {
          options.push({
            id: calendar.id,
            name: calendar.calendar_name || `${calendar.provider} Calendar`,
            color: calendar.color,
            isDefault: false,
          });
        });
      }

      return options;
    },
    enabled: !isLoading && !!targetUserId,
  });
}

export function useUpdateLinkedCalendarColor() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      calendarId, 
      color 
    }: { 
      calendarId: string; 
      color: string; 
    }) => {
      const { data, error } = await supabase
        .from('linked_calendars')
        .update({ color })
        .eq('id', calendarId)
        .select()
        .single();

      if (error) {
        throw error;
      }

      return data;
    },
    onSuccess: (data) => {
      // Invalidate and refetch linked calendars
      queryClient.invalidateQueries({ queryKey: ['linked-calendars'] });
      queryClient.invalidateQueries({ queryKey: ['calendar-options'] });
    },
  });
}

export function useDeleteLinkedCalendar() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (calendarId: string) => {
      const { error } = await supabase
        .from('linked_calendars')
        .delete()
        .eq('id', calendarId);

      if (error) {
        throw error;
      }
    },
    onSuccess: () => {
      // Invalidate and refetch linked calendars
      queryClient.invalidateQueries({ queryKey: ['linked-calendars'] });
      queryClient.invalidateQueries({ queryKey: ['calendar-options'] });
    },
  });
} 