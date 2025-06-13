import { supabase } from '../lib/supabase';
import { FamilyMember } from '../types/family';

export async function createFamily(userId: string, familyName: string, familyDescription: string): Promise<string> {
  if (!userId) {
    throw new Error('User is not authenticated and cannot create a family.');
  }

  const { data, error } = await supabase.rpc('create_new_family', {
    p_user_id: userId, // Pass the user ID as a parameter
    p_family_name: familyName,
    p_family_description: familyDescription,
  });

  if (error) {
    console.error('Error creating new family:', error);
    throw new Error(error.message);
  }
  return data;
}

export async function getFamilyMembers(): Promise<FamilyMember[]> {
  const { data, error } = await supabase.rpc('get_my_family_members');

  console.log('App RPC call result:', { data, error });
  console.log('Data length:', data?.length);

  if (error) {
    console.error('Error fetching family members:', error);
    throw new Error(error.message);
  }

  // Return empty array if user is not in any family yet
  return data || [];
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

export async function removeFamilyMember(userIdToRemove: string): Promise<void> {
  const { error } = await supabase.rpc('remove_family_member', {
    user_id_to_remove: userIdToRemove,
  });

  if (error) {
    console.error('Error removing family member:', error);
    throw new Error(error.message);
  }
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