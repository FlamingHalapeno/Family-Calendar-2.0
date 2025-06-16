import { supabase } from '../lib/supabase';
import { FamilyMember } from '../types/family';
import { UserProfile } from '../types';

export async function createFamily(userId: string, familyName: string, familyDescription: string): Promise<string> {
  if (!userId) {
    throw new Error('User is not authenticated and cannot create a family.');
  }

  const { data, error } = await supabase.rpc('create_new_family', {
    p_user_id: userId,
    p_family_name: familyName,
    p_family_description: familyDescription,
  });

  if (error) {
    console.error('Error creating new family:', error);
    throw new Error(error.message);
  }
  return data;
}

export async function getFamilyMembers(userId: string): Promise<FamilyMember[]> {
  if (!userId) {
    console.log('getFamilyMembers was called without a user ID.');
    return [];
  }

  console.log(`getFamilyMembers: Fetching family for user: ${userId}`);

  const { data, error } = await supabase.rpc('get_my_family_members', {
    p_user_id: userId,
  });

  console.log('RPC call result:', { data, error });

  if (error) {
    console.error('Error fetching family members:', error);
    throw new Error(error.message);
  }

  return data || [];
}

export async function removeFamilyMember(userIdToRemove: string): Promise<void> {
  const { error } = await supabase.rpc('remove_family_member', {
    user_id_to_remove: userIdToRemove,
  });

  if (error) {
    console.error('Error removing family member:', error);
    throw new Error(error.message);
  }
}

export async function getFamilyMembersAlternative(): Promise<FamilyMember[]> {
  // Get the current user ID from the session
  const { data: { session }, error: sessionError } = await supabase.auth.getSession();
  
  console.log('Session debug:', {
    session: session,
    sessionError: sessionError,
    user: session?.user,
    userId: session?.user?.id,
    accessToken: !!session?.access_token
  });
  
  const userId = session?.user?.id;
  
  console.log('Current session user ID:', userId);
  
  if (!userId) {
    throw new Error('User not authenticated');
  }

  // Alternative approach: Get current user's family_id first, then get all members
  const { data: userFamilyData, error: familyError } = await supabase
    .from('family_members')
    .select('family_id')
    .eq('user_id', userId)
    .limit(1)
    .single();

  console.log('User family lookup:', { userFamilyData, familyError });

  // If user is not in any family yet, return empty array instead of throwing error
  if (familyError || !userFamilyData) {
    console.log('User is not in any family yet');
    return [];
  }

  // Now get all members of that family
  const { data: membersData, error: membersError } = await supabase
    .from('family_members')
    .select(`
      id,
      role,
      users (
        id,
        first_name,
        last_name,
        email,
        avatar_url
      )
    `)
    .eq('family_id', userFamilyData.family_id);

  console.log('Members lookup:', { membersData, membersError });

  if (membersError) {
    throw new Error('Could not fetch family members');
  }

  // Transform the data to match FamilyMember interface
  return membersData?.map((member: any) => ({
    id: member.users.id,
    first_name: member.users.first_name,
    last_name: member.users.last_name,
    email: member.users.email,
    role: member.role,
    avatar_url: member.users.avatar_url,
  })) || [];
}

export async function getFamilyMembersWithUserId(userId: string): Promise<FamilyMember[]> {
  console.log('getFamilyMembersWithUserId called with:', userId);

  // Get current user's family_id first
  const { data: userFamilyData, error: familyError } = await supabase
    .from('family_members')
    .select('family_id')
    .eq('user_id', userId)
    .limit(1)
    .single();

  console.log('User family lookup:', { userFamilyData, familyError });

  // If user is not in any family yet, return empty array instead of throwing error
  if (familyError || !userFamilyData) {
    console.log('User is not in any family yet');
    return [];
  }

  // Get all members of that family
  const { data: membersData, error: membersError } = await supabase
    .from('family_members')
    .select(`
      id,
      role,
      users (
        id,
        first_name,
        last_name,
        email,
        avatar_url
      )
    `)
    .eq('family_id', userFamilyData.family_id);

  console.log('Members lookup:', { membersData, membersError });

  if (membersError) {
    throw new Error('Could not fetch family members');
  }

  // Transform the data to match FamilyMember interface
  return membersData?.map((member: any) => ({
    id: member.users.id,
    first_name: member.users.first_name,
    last_name: member.users.last_name,
    email: member.users.email,
    role: member.role,
    avatar_url: member.users.avatar_url,
  })) || [];
}

export async function getCurrentUserFamilyId(userId: string): Promise<string | null> {
  if (!userId) {
    return null;
  }
  const { data, error } = await supabase.rpc('get_my_family_id', {
    p_user_id: userId
  });
  if (error) {
    console.error('Error fetching current user family ID:', error);
    return null;
  }
  return data;
}

export async function generateInviteCode(familyId: string, creatorId: string): Promise<string> {
  const { data, error } = await supabase.rpc('generate_family_invite_code', {
    p_family_id: familyId,
    p_creator_id: creatorId,
  });

  if (error) {
    throw new Error(error.message);
  }
  return data;
}

export async function joinFamily(code: string, userId: string): Promise<string> {
  if (!userId) {
    throw new Error('User ID must be provided to join a family.');
  }
  const { data, error } = await supabase.rpc('join_family_with_code', {
    p_code: code,
    p_user_id: userId,
  });

  if (error) {
    throw new Error(error.message);
  }
  return data;
}

export async function addManagedFamilyMember(
  familyId: string,
  firstName: string,
  lastName: string
): Promise<UserProfile> {
  if (!familyId || !firstName || !lastName) {
    throw new Error('Family ID, first name, and last name are required.');
  }

  // Call the Edge Function instead of an RPC
  const { data, error } = await supabase.functions.invoke('create-managed-user', {
    body: { family_id: familyId, first_name: firstName, last_name: lastName },
  });

  if (error) {
    console.error('Error adding managed family member:', error);
    throw new Error(error.message);
  }

  return data;
}