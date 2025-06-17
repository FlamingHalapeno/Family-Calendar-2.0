import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey)
    const { familyId } = await req.json()

    if (!familyId) {
      return new Response(
        JSON.stringify({ error: 'Family ID is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get the current user from the auth header
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'No authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const { data: { user }, error: userError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    )

    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid auth token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Check if current user is admin of the family
    const { data: currentUserRole } = await supabase
      .from('family_members')
      .select('role')
      .eq('family_id', familyId)
      .eq('user_id', user.id)
      .single()

    if (!currentUserRole || currentUserRole.role !== 'admin') {
      return new Response(
        JSON.stringify({ error: 'Only admins can disband the family' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get all family members
    const { data: familyMembers, error: membersError } = await supabase
      .from('family_members')
      .select('user_id')
      .eq('family_id', familyId)

    if (membersError) {
      throw membersError
    }

    // Check each member to see if they're managed accounts and collect them
    const managedUserIds: string[] = []
    if (familyMembers) {
      for (const member of familyMembers) {
        const { data: authUser } = await supabase.auth.admin.getUserById(member.user_id)
        if (!authUser.user?.email) {
          managedUserIds.push(member.user_id)
        }
      }
    }

    // Delete all family-related data (cascading deletes should handle most of this)
    // Delete events
    const { error: eventsError } = await supabase
      .from('events')
      .delete()
      .eq('family_id', familyId)

    if (eventsError) {
      console.error('Error deleting events:', eventsError)
    }

    // Delete tasks
    const { error: tasksError } = await supabase
      .from('tasks')
      .delete()
      .eq('family_id', familyId)

    if (tasksError) {
      console.error('Error deleting tasks:', tasksError)
    }

    // Delete notes
    const { error: notesError } = await supabase
      .from('notes')
      .delete()
      .eq('family_id', familyId)

    if (notesError) {
      console.error('Error deleting notes:', notesError)
    }

    // Delete contacts
    const { error: contactsError } = await supabase
      .from('contacts')
      .delete()
      .eq('family_id', familyId)

    if (contactsError) {
      console.error('Error deleting contacts:', contactsError)
    }

    // Delete family invites
    const { error: invitesError } = await supabase
      .from('family_invites')
      .delete()
      .eq('family_id', familyId)

    if (invitesError) {
      console.error('Error deleting family invites:', invitesError)
    }

    // Delete all family members
    const { error: removeMembersError } = await supabase
      .from('family_members')
      .delete()
      .eq('family_id', familyId)

    if (removeMembersError) {
      throw removeMembersError
    }

    // Delete managed user accounts
    for (const userId of managedUserIds) {
      // Delete from users table
      const { error: deleteUserError } = await supabase
        .from('users')
        .delete()
        .eq('id', userId)

      if (deleteUserError) {
        console.error('Error deleting user profile:', deleteUserError)
      }

      // Delete from auth.users
      const { error: deleteAuthError } = await supabase.auth.admin.deleteUser(userId)
      
      if (deleteAuthError) {
        console.error('Error deleting auth user:', deleteAuthError)
      }
    }

    // Finally, delete the family itself
    const { error: deleteFamilyError } = await supabase
      .from('families')
      .delete()
      .eq('id', familyId)

    if (deleteFamilyError) {
      throw deleteFamilyError
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        managedAccountsDeleted: managedUserIds.length,
        familyDeleted: true 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error in disband-family function:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
}) 