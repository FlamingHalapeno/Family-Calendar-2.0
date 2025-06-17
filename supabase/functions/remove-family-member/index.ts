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
    console.log('Starting remove-family-member function')
    
    // Check environment variables
    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('Missing environment variables')
      return new Response(
        JSON.stringify({ error: 'Server configuration error' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey)
    
    // Parse request body
    let body
    try {
      body = await req.json()
    } catch (parseError) {
      console.error('Error parsing request body:', parseError)
      return new Response(
        JSON.stringify({ error: 'Invalid JSON in request body' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const { memberUserId, familyId } = body
    console.log('Request params:', { memberUserId, familyId })

    if (!memberUserId || !familyId) {
      return new Response(
        JSON.stringify({ error: 'Member user ID and family ID are required' }),
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
      console.error('Auth error:', userError)
      return new Response(
        JSON.stringify({ error: 'Invalid auth token', details: userError?.message }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('Current user:', user.id)

    // Check if current user is admin of the family
    const { data: currentUserRole, error: roleError } = await supabase
      .from('family_members')
      .select('role')
      .eq('family_id', familyId)
      .eq('user_id', user.id)
      .single()

    if (roleError) {
      console.error('Error fetching user role:', roleError)
      return new Response(
        JSON.stringify({ error: 'Error checking user permissions', details: roleError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (!currentUserRole || currentUserRole.role !== 'admin') {
      return new Response(
        JSON.stringify({ error: 'Only admins can remove family members' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('User is admin, proceeding with removal')

    // Check if the member to remove is a managed account
    let isManagedAccount = false
    try {
      const { data: authUser, error: getUserError } = await supabase.auth.admin.getUserById(memberUserId)
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

    // Remove from family_members table
    console.log('Removing from family_members table')
    const { error: removeMemberError } = await supabase
      .from('family_members')
      .delete()
      .eq('user_id', memberUserId)
      .eq('family_id', familyId)

    if (removeMemberError) {
      console.error('Error removing family member:', removeMemberError)
      throw new Error(`Failed to remove family member: ${removeMemberError.message}`)
    }

    console.log('Successfully removed from family_members')

    // If it's a managed account, delete the user entirely
    if (isManagedAccount) {
      console.log('Deleting managed account')
      
      // Delete from auth.users first - this should cascade to users table if properly configured
      console.log('Attempting to delete from auth.users first')
      const { error: deleteAuthError } = await supabase.auth.admin.deleteUser(memberUserId)
      
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
        .eq('id', memberUserId)

      if (deleteUserError) {
        console.error('Error force deleting user profile:', deleteUserError)
        console.error('Full error details:', JSON.stringify(deleteUserError, null, 2))
      } else {
        console.log('Successfully force deleted user from users table, count:', count)
      }
    }

    return new Response(
      JSON.stringify({ success: true, managedAccountDeleted: isManagedAccount }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error in remove-family-member function:', error)
    return new Response(
      JSON.stringify({ 
        error: error.message || 'Unknown error occurred',
        type: error.constructor.name 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
}) 