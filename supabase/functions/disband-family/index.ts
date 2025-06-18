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

    // Process each family member by calling remove-family-member logic for each
    let managedAccountsDeleted = 0
    if (familyMembers) {
      for (const member of familyMembers) {
        console.log('Processing family member:', member.user_id)
        
        // Check if the member is a managed account (exact same logic as remove-family-member)
        let isManagedAccount = false
        try {
          const { data: authUser, error: getUserError } = await supabase.auth.admin.getUserById(member.user_id)
          if (getUserError) {
            console.error('Error getting user by ID:', getUserError)
            // Continue anyway, we'll still try to remove them from family_members
          } else {
            // Check if email is empty OR starts with "managed.user." (our managed account pattern)
            const email = authUser.user?.email || ''
            isManagedAccount = !email || email.startsWith('managed.user.') || email.includes('@local.app')
            console.log('Target user email:', email)
            console.log('Target user managed status:', isManagedAccount)
          }
        } catch (adminError) {
          console.error('Error checking if user is managed:', adminError)
          // Continue anyway
        }

        // Remove from family_members table first
        console.log('Removing from family_members table')
        const { error: removeMemberError } = await supabase
          .from('family_members')
          .delete()
          .eq('user_id', member.user_id)
          .eq('family_id', familyId)

        if (removeMemberError) {
          console.error('Error removing family member:', removeMemberError)
          // Continue with other members
        } else {
          console.log('Successfully removed from family_members')
        }

        // If it's a managed account, delete the user entirely
        if (isManagedAccount) {
          console.log('Deleting managed account')
          
          // Delete from auth.users first - this should cascade to users table if properly configured
          console.log('Attempting to delete from auth.users first')
          const { error: deleteAuthError } = await supabase.auth.admin.deleteUser(member.user_id)
          
          if (deleteAuthError) {
            console.error('Error deleting auth user:', deleteAuthError)
            console.error('Full auth error details:', JSON.stringify(deleteAuthError, null, 2))
          } else {
            console.log('Successfully deleted managed user from auth.users')
          }

          // Now force delete from users table in case it didn't cascade
          console.log('Force deleting from users table')
          const { error: deleteUserError, count } = await supabase
            .from('users')
            .delete({ count: 'exact' })
            .eq('id', member.user_id)

          if (deleteUserError) {
            console.error('Error force deleting user profile:', deleteUserError)
            console.error('Full error details:', JSON.stringify(deleteUserError, null, 2))
          } else {
            console.log('Successfully force deleted user from users table, count:', count)
            managedAccountsDeleted++
          }
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

    // Family members have already been removed individually above

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
        managedAccountsDeleted: managedAccountsDeleted,
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