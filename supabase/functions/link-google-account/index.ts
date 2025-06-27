import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const googleClientId = Deno.env.get('GOOGLE_CLIENT_ID')!;
const googleClientSecret = Deno.env.get('GOOGLE_CLIENT_SECRET')!;

interface RequestBody {
  authorization_code: string;
  redirect_uri: string;
}

interface GoogleTokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  scope: string;
  token_type: string;
}

interface GoogleCalendarListResponse {
  items: Array<{
    id: string;
    summary: string;
    description?: string;
    backgroundColor?: string;
    accessRole: string;
  }>;
}

interface GoogleUserInfo {
  email: string;
  name: string;
  picture?: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { authorization_code, redirect_uri }: RequestBody = await req.json();

    if (!authorization_code) {
      return new Response(
        JSON.stringify({ success: false, error: 'Authorization code is required' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Get the authenticated user from the request
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ success: false, error: 'Authentication required' }),
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // Get user from auth token
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    
    if (userError || !user) {
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid authentication' }),
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Exchange authorization code for tokens
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: googleClientId,
        client_secret: googleClientSecret,
        code: authorization_code,
        grant_type: 'authorization_code',
        redirect_uri: redirect_uri,
      }),
    });

    if (!tokenResponse.ok) {
      const error = await tokenResponse.text();
      console.error('Token exchange failed:', error);
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to exchange authorization code' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    const tokens: GoogleTokenResponse = await tokenResponse.json();

    // Get user info from Google
    const userInfoResponse = await fetch(
      `https://www.googleapis.com/oauth2/v1/userinfo?access_token=${tokens.access_token}`
    );

    if (!userInfoResponse.ok) {
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to fetch user information' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    const userInfo: GoogleUserInfo = await userInfoResponse.json();

    // Get user's calendars from Google Calendar API
    const calendarListResponse = await fetch(
      'https://www.googleapis.com/calendar/v3/users/me/calendarList',
      {
        headers: {
          'Authorization': `Bearer ${tokens.access_token}`,
        },
      }
    );

    if (!calendarListResponse.ok) {
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to fetch calendar list' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    const calendarList: GoogleCalendarListResponse = await calendarListResponse.json();

    // Get user's family ID
    const { data: familyMember, error: familyError } = await supabase
      .from('family_members')
      .select('family_id')
      .eq('user_id', user.id)
      .single();

    if (familyError || !familyMember) {
      return new Response(
        JSON.stringify({ success: false, error: 'User must be part of a family to link calendars' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Store linked calendars - only store calendars where user has write access
    const linkedCalendars = [];
    const expiresAt = new Date(Date.now() + tokens.expires_in * 1000);

    for (const calendar of calendarList.items) {
      // Only link calendars where user has owner or writer access
      if (calendar.accessRole === 'owner' || calendar.accessRole === 'writer') {
        try {
          // Insert or update linked calendar
          const { data: linkedCalendar, error: insertError } = await supabase
            .from('linked_calendars')
            .upsert({
              user_id: user.id,
              family_id: familyMember.family_id,
              provider: 'google',
              account_email: userInfo.email,
              calendar_id: calendar.id,
              calendar_name: calendar.summary,
              // NOTE: In production, these tokens should be encrypted using Supabase Vault
              // For now, storing as plain text for development
              access_token: tokens.access_token,
              refresh_token: tokens.refresh_token || null,
              expires_at: expiresAt.toISOString(),
              color: calendar.backgroundColor || '#007AFF',
              is_synced: true,
              updated_at: new Date().toISOString(),
            }, {
              onConflict: 'user_id,provider,calendar_id',
            })
            .select()
            .single();

          if (insertError) {
            console.error('Failed to insert linked calendar:', insertError);
          } else {
            linkedCalendars.push({
              id: calendar.id,
              name: calendar.summary,
              description: calendar.description,
              color: calendar.backgroundColor || '#007AFF',
              accessRole: calendar.accessRole,
            });
          }
        } catch (error) {
          console.error('Error processing calendar:', calendar.id, error);
        }
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Successfully linked ${linkedCalendars.length} calendar(s)`,
        calendars: linkedCalendars,
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Error in link-google-account function:', error);
    return new Response(
      JSON.stringify({ success: false, error: 'Internal server error' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
}); 