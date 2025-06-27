import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

interface CreateExternalEventRequest {
  eventData: {
    title: string;
    description?: string;
    start_date: string;
    end_date: string;
    user_id?: string;
    family_id?: string;
    color?: string;
    linked_calendar_id: string;
  };
}

interface GoogleCalendarEvent {
  summary: string;
  description?: string;
  start: {
    dateTime?: string;
    date?: string;
    timeZone?: string;
  };
  end: {
    dateTime?: string;
    date?: string;
    timeZone?: string;
  };
  colorId?: string;
}

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    if (req.method !== 'POST') {
      return new Response(
        JSON.stringify({ error: 'Method not allowed' }),
        { 
          status: 405, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    const { eventData }: CreateExternalEventRequest = await req.json();

    if (!eventData.linked_calendar_id) {
      return new Response(
        JSON.stringify({ error: 'linked_calendar_id is required for external events' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Get the linked calendar info with encrypted tokens
    const { data: linkedCalendar, error: calendarError } = await supabase
      .from('linked_calendars')
      .select('*')
      .eq('id', eventData.linked_calendar_id)
      .single();

    if (calendarError || !linkedCalendar) {
      return new Response(
        JSON.stringify({ error: 'Linked calendar not found' }),
        { 
          status: 404, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // TODO: Decrypt tokens using Supabase Vault
    // For now, assuming tokens are stored as-is (should be encrypted in production)
    let accessToken = linkedCalendar.access_token;
    const refreshToken = linkedCalendar.refresh_token;

    // Check if access token is expired and refresh if needed
    if (linkedCalendar.expires_at && new Date() >= new Date(linkedCalendar.expires_at)) {
      if (!refreshToken) {
        return new Response(
          JSON.stringify({ error: 'Access token expired and no refresh token available' }),
          { 
            status: 401, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
      }

      // Refresh the token
      const refreshResponse = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          client_id: Deno.env.get('GOOGLE_CLIENT_ID')!,
          client_secret: Deno.env.get('GOOGLE_CLIENT_SECRET')!,
          refresh_token: refreshToken,
          grant_type: 'refresh_token',
        }),
      });

      if (!refreshResponse.ok) {
        return new Response(
          JSON.stringify({ error: 'Failed to refresh access token' }),
          { 
            status: 401, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
      }

      const refreshData = await refreshResponse.json();
      accessToken = refreshData.access_token;

      // Update the token in the database
      await supabase
        .from('linked_calendars')
        .update({
          access_token: accessToken,
          expires_at: new Date(Date.now() + refreshData.expires_in * 1000).toISOString(),
        })
        .eq('id', eventData.linked_calendar_id);
    }

    // Prepare the event data for the external provider
    let externalEventData: GoogleCalendarEvent;
    
    if (linkedCalendar.provider === 'google') {
      // Check if it's an all-day event
      const startDate = new Date(eventData.start_date);
      const endDate = new Date(eventData.end_date);
      const isAllDay = startDate.getHours() === 0 && startDate.getMinutes() === 0 &&
                      endDate.getHours() === 23 && endDate.getMinutes() === 59;

      externalEventData = {
        summary: eventData.title,
        description: eventData.description,
        start: isAllDay 
          ? { date: startDate.toISOString().split('T')[0] }
          : { dateTime: eventData.start_date, timeZone: 'UTC' },
        end: isAllDay
          ? { date: new Date(endDate.getTime() + 24 * 60 * 60 * 1000).toISOString().split('T')[0] }
          : { dateTime: eventData.end_date, timeZone: 'UTC' },
      };
    } else {
      return new Response(
        JSON.stringify({ error: 'Unsupported calendar provider' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Create the event in the external calendar
    const createResponse = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/${linkedCalendar.calendar_id}/events`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(externalEventData),
      }
    );

    if (!createResponse.ok) {
      const errorData = await createResponse.text();
      return new Response(
        JSON.stringify({ error: `Failed to create external event: ${errorData}` }),
        { 
          status: createResponse.status, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    const createdExternalEvent = await createResponse.json();

    // Save the event to our local database with the external event ID
    const { data: localEvent, error: localEventError } = await supabase
      .from('events')
      .insert([{
        ...eventData,
        external_event_id: createdExternalEvent.id,
      }])
      .select()
      .single();

    if (localEventError) {
      // If local save fails, we should ideally delete the external event
      // For now, we'll just log the error
      console.error('Failed to save event locally:', localEventError);
      return new Response(
        JSON.stringify({ error: 'Event created externally but failed to save locally' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        event: localEvent,
        external_event: createdExternalEvent,
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Error in create-external-event function:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
}); 