import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

console.log('Create Managed User function started');

// Define the shape of the incoming request data
interface ManagedUserPayload {
  family_id: string;
  first_name: string;
  last_name: string;
}

Deno.serve(async (req: Request) => {
  console.log('Request received:', req.method);
  // This is needed if you're planning to invoke your function from a browser.
  if (req.method === 'OPTIONS') {
    console.log('Handling OPTIONS request');
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    console.log('Parsing request body');
    const { family_id, first_name, last_name }: ManagedUserPayload = await req.json();
    console.log('Payload:', { family_id, first_name, last_name });

    // Create a Supabase client with the user's auth token
    const userSupabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: { headers: { Authorization: req.headers.get('Authorization')! } },
      }
    );

    console.log('Getting calling user');
    // Get the calling user's ID
    const { data: { user } } = await userSupabaseClient.auth.getUser();
    if (!user) {
      console.error('Authentication error: User not found');
      return new Response(JSON.stringify({ error: 'User not authenticated.' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    console.log('Calling user ID:', user.id);

    console.log('Verifying admin role');
    // Verify the user is an admin of the target family
    const { data: memberData, error: memberError } = await userSupabaseClient
      .from('family_members')
      .select('role')
      .eq('family_id', family_id)
      .eq('user_id', user.id)
      .single();

    if (memberError) {
      console.error('Error verifying admin role:', memberError);
      throw new Error('Could not verify family membership.');
    }

    if (memberData?.role !== 'admin') {
      console.warn('Permission denied: User is not an admin.', { userId: user.id, familyId: family_id });
      return new Response(JSON.stringify({ error: 'Only admins can add members.' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    console.log('Admin role verified');

    // Create a Supabase admin client to create the user
    const adminClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      // Correctly use the built-in service role key environment variable
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );
    console.log('Admin client created');

    // Generate a unique, non-functional email and a random password
    const email = `managed.user.${crypto.randomUUID()}@local.app`;
    const password = crypto.randomUUID();

    console.log('Creating managed user with email:', email);
    // Create the new user using the admin API
    const { data: createData, error: createError } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        first_name,
        last_name,
        is_managed: true,
      },
    });

    if (createError) {
      console.error('Error creating user:', createError);
      throw new Error(`Failed to create managed user: ${createError.message}`);
    }
    if (!createData.user) {
      console.error('User creation failed: No user data returned');
      throw new Error("Failed to create managed user.");
    }
    const newUserId = createData.user.id;
    console.log('Managed user created with ID:', newUserId);

    console.log('Adding new user to family');
    // Add the new user to the family
    const { error: insertError } = await adminClient
      .from('family_members')
      .insert({
        family_id,
        user_id: newUserId,
        role: 'member',
      });

    if (insertError) {
      console.error('Error inserting into family_members:', insertError);
      // Attempt to clean up the created user if insertion fails
      await adminClient.auth.admin.deleteUser(newUserId);
      console.log('Cleaned up orphaned user:', newUserId);
      throw new Error(`Failed to add user to family: ${insertError.message}`);
    }
    console.log('User added to family successfully');

    console.log('Fetching created user profile');
    const { data: profileData, error: profileError } = await adminClient
      .from('users')
      .select('id, first_name, last_name, email, avatar_url')
      .eq('id', newUserId)
      .single();

    if (profileError) {
      console.error('Error fetching new user profile:', profileError);
      throw new Error('Could not retrieve created user profile.');
    }

    const profile = {
      ...profileData,
      role: 'member' // Add role manually
    };

    console.log('Function completed successfully');
    return new Response(JSON.stringify(profile), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (e) {
    const err = e as Error;
    console.error('Top-level error caught:', err);
    return new Response(JSON.stringify({ error: err.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});