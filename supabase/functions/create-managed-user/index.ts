import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

// Define the shape of the incoming request data
interface ManagedUserPayload {
  family_id: string;
  first_name: string;
  last_name: string;
}

Deno.serve(async (req) => {
  // This is needed if you're planning to invoke your function from a browser.
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { family_id, first_name, last_name }: ManagedUserPayload = await req.json();

    // Create a Supabase client with the user's auth token
    const userSupabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: { headers: { Authorization: req.headers.get('Authorization')! } },
      }
    );

    // Get the calling user's ID
    const { data: { user } } = await userSupabaseClient.auth.getUser();
    if (!user) {
      throw new Error("User not authenticated.");
    }

    // Verify the user is an admin of the target family
    const { data: memberData, error: memberError } = await userSupabaseClient
      .from('family_members')
      .select('role')
      .eq('family_id', family_id)
      .eq('user_id', user.id)
      .single();

    if (memberError || memberData?.role !== 'admin') {
      return new Response(JSON.stringify({ error: 'Only admins can add members.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 403,
      });
    }

    // Create a Supabase admin client to create the user
    const adminClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      // Use the correct custom environment variable name
      Deno.env.get('CUSTOM_SERVICE_ROLE_KEY') ?? ''
    );

    // Generate a unique, non-functional email and a random password
    const email = `managed.user.${crypto.randomUUID()}@local.app`;
    const password = crypto.randomUUID();

    // Create the new user using the admin API
    const { data: newUser, error: createError } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        first_name,
        last_name,
        is_managed: true,
      },
    });

    if (createError) throw createError;
    if (!newUser.user) throw new Error("Failed to create managed user.");

    // Add the new user to the family
    const { error: insertError } = await adminClient
      .from('family_members')
      .insert({
        family_id: family_id,
        user_id: newUser.user.id,
        role: 'member',
      });

    if (insertError) throw insertError;

    // Return the profile of the newly created user
    const { data: profile } = await adminClient
      .from('users')
      .select('*')
      .eq('id', newUser.user.id)
      .single();

    return new Response(JSON.stringify(profile), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    });
  }
});