import { supabase } from '../lib/supabase';
import { UserProfile } from '../types';

/**
 * Fetches the user profile from the 'users' table.
 * @param userId The ID of the user whose profile to fetch.
 * @returns A promise that resolves to the UserProfile or null if not found.
 */
export async function getUserProfile(userId: string): Promise<UserProfile | null> {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // No row found
        return null;
      }
      console.error('Error fetching user profile:', error);
      throw error;
    }

    return data as UserProfile;
  } catch (error) {
    console.error('Error in getUserProfile:', error);
    return null;
  }
}

/**
 * Updates or inserts a user profile in the 'users' table.
 * Supabase's upsert functionality is used here.
 * @param profile The profile data to update or insert.
 *                 The 'id' field within the profile object is used to identify the user.
 * @returns A promise that resolves to the updated UserProfile or null if an error occurs.
 */
export async function updateProfile(profile: Partial<UserProfile> & { id: string }): Promise<UserProfile | null> {
  try {
    const { data, error } = await supabase
      .from('users')
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