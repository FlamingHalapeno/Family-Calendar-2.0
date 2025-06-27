import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

interface FetchExternalEventsRequest {
  linked_calendar_id: string;
  time_min?: string; // ISO string for start date
  time_max?: string; // ISO string for end date
}

interface GoogleCalendarEventResponse {
  items: GoogleCalendarEvent[];
  nextPageToken?: string;
}

interface GoogleCalendarEvent {
  id: string;
  summary?: string;
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
  status?: string;
  htmlLink?: string;
  created?: string;
  updated?: string;
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

    const { linked_calendar_id, time_min, time_max }: FetchExternalEventsRequest = await req.json();

    if (!linked_calendar_id) {
      return new Response(
        JSON.stringify({ error: 'linked_calendar_id is required' }),
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
      .eq('id', linked_calendar_id)
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
        .eq('id', linked_calendar_id);
    }

    if (linkedCalendar.provider !== 'google') {
      return new Response(
        JSON.stringify({ error: 'Unsupported calendar provider' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Build the URL with query parameters
    const url = new URL(`https://www.googleapis.com/calendar/v3/calendars/${linkedCalendar.calendar_id}/events`);
    
    // Add query parameters
    url.searchParams.set('singleEvents', 'true');
    url.searchParams.set('orderBy', 'startTime');
    url.searchParams.set('maxResults', '250'); // Adjust as needed
    
    if (time_min) {
      url.searchParams.set('timeMin', time_min);
    }
    if (time_max) {
      url.searchParams.set('timeMax', time_max);
    }

    // Fetch events from Google Calendar
    const fetchResponse = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    });

    if (!fetchResponse.ok) {
      const errorData = await fetchResponse.text();
      return new Response(
        JSON.stringify({ error: `Failed to fetch external events: ${errorData}` }),
        { 
          status: fetchResponse.status, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    const googleResponse: GoogleCalendarEventResponse = await fetchResponse.json();

    // Transform Google Calendar events to our format
    const transformedEvents = googleResponse.items
      .filter(event => event.status !== 'cancelled') // Filter out cancelled events
      .map(event => {
        const isAllDay = !event.start.dateTime && event.start.date;
        
        let startDate: string;
        let endDate: string;

        if (isAllDay) {
          startDate = new Date(event.start.date + 'T00:00:00.000Z').toISOString();
          endDate = new Date(event.end.date + 'T23:59:59.999Z').toISOString();
        } else {
          startDate = event.start.dateTime!;
          endDate = event.end.dateTime!;
        }

        return {
          id: `external_${event.id}`, // Prefix to avoid ID conflicts with local events
          title: event.summary || 'Untitled Event',
          description: event.description || '',
          start_date: startDate,
          end_date: endDate,
          user_id: linkedCalendar.user_id,
          family_id: linkedCalendar.family_id,
          color: linkedCalendar.color, // Use the calendar's color
          linked_calendar_id: linked_calendar_id,
          external_event_id: event.id,
          created_at: event.created || new Date().toISOString(),
          updated_at: event.updated || new Date().toISOString(),
          // Add metadata to identify this as an external event
          _isExternal: true,
          _source: 'google',
          _htmlLink: event.htmlLink,
        };
      });

    return new Response(
      JSON.stringify({
        success: true,
        events: transformedEvents,
        calendar_info: {
          id: linkedCalendar.id,
          name: linkedCalendar.calendar_name,
          provider: linkedCalendar.provider,
          color: linkedCalendar.color,
        },
        next_page_token: googleResponse.nextPageToken,
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Error in fetch-external-events function:', error);
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