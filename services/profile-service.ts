import { supabase } from '../lib/supabase';
import { UserProfile } from '../types';

/**
 * Fetches the user profile from the 'profiles' table.
 * @param userId The ID of the user whose profile is to be fetched.
 * @returns A promise that resolves to the UserProfile or null if not found or an error occurs.
 */
export async function getProfile(userId: string): Promise<UserProfile | null> {
  try {
    const { data, error, status } = await supabase
      .from('profiles')
      .select('id, username, avatar_url, color, updated_at')
      .eq('id', userId)
      .single();

    if (error && status !== 406) { // 406 is when no rows are found, which is not necessarily an error here
      console.error('Error fetching profile:', error);
      throw error;
    }

    return data as UserProfile | null;
  } catch (error) {
    console.error('Error in getProfile:', error);
    return null;
  }
}

/**
 * Updates or inserts a user profile in the 'profiles' table.
 * Supabase's upsert functionality is used here.
 * @param profile The profile data to update or insert.
 *                 The 'id' field within the profile object is used to identify the user.
 * @returns A promise that resolves to the updated UserProfile or null if an error occurs.
 */
export async function updateProfile(profile: Partial<UserProfile> & { id: string }): Promise<UserProfile | null> {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .upsert(profile)
      .select()
      .single();

    if (error) {
      console.error('Error updating profile:', error);
      throw error;
    }
    return data as UserProfile | null;
  } catch (error) {
    console.error('Error in updateProfile:', error);
    return null;
  }
} 