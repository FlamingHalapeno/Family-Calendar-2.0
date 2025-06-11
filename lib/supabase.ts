import { createClient } from '@supabase/supabase-js';
import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import 'react-native-url-polyfill/auto'; // Required for Supabase to work in React Native

// Get environment variables from Expo constants or process.env for wider compatibility
const supabaseUrl = Constants.expoConfig?.extra?.supabaseUrl ?? process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = Constants.expoConfig?.extra?.supabaseAnonKey ?? process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  const message = 'Supabase URL or Anon Key is missing. Ensure EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY are set in your app config (app.json or app.config.js under "extra") or .env file.';
  console.error(message);
  throw new Error(message); // Throw an error to halt execution if keys are missing
}

// Hybrid storage adapter that handles large values gracefully
const HybridStorageAdapter = {
  getItem: async (key: string): Promise<string | null> => {
    try {
      // Try SecureStore first for better security
      const item = await SecureStore.getItemAsync(key);
      return item;
    } catch (error) {
      // If SecureStore fails, try AsyncStorage as fallback
      try {
        return await AsyncStorage.getItem(key);
      } catch (fallbackError) {
        console.warn(`Failed to get item ${key} from both SecureStore and AsyncStorage:`, fallbackError);
        return null;
      }
    }
  },

  setItem: async (key: string, value: string): Promise<void> => {
    // Check if value is too large for SecureStore (2048 byte limit)
    const valueSize = new Blob([value]).size;
    
    if (valueSize > 2000) { // Use 2000 to be safe, not exactly 2048
      // Use AsyncStorage for large values
      try {
        await AsyncStorage.setItem(key, value);
        // Remove from SecureStore if it exists there
        try {
          await SecureStore.deleteItemAsync(key);
        } catch (deleteError) {
          // Ignore delete errors - item might not exist in SecureStore
        }
      } catch (error) {
        console.error(`Failed to store large item ${key} in AsyncStorage:`, error);
        throw error;
      }
    } else {
      // Use SecureStore for smaller values (more secure)
      try {
        await SecureStore.setItemAsync(key, value);
        // Remove from AsyncStorage if it exists there
        try {
          await AsyncStorage.removeItem(key);
        } catch (deleteError) {
          // Ignore delete errors - item might not exist in AsyncStorage
        }
      } catch (error) {
        console.warn(`Failed to store item ${key} in SecureStore, falling back to AsyncStorage:`, error);
        // Fallback to AsyncStorage
        try {
          await AsyncStorage.setItem(key, value);
        } catch (fallbackError) {
          console.error(`Failed to store item ${key} in both SecureStore and AsyncStorage:`, fallbackError);
          throw fallbackError;
        }
      }
    }
  },

  removeItem: async (key: string): Promise<void> => {
    // Remove from both storages to be thorough
    try {
      await SecureStore.deleteItemAsync(key);
    } catch (error) {
      // Ignore errors - item might not exist in SecureStore
    }
    
    try {
      await AsyncStorage.removeItem(key);
    } catch (error) {
      // Ignore errors - item might not exist in AsyncStorage
    }
  },
};

// Create Supabase client with hybrid storage
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: HybridStorageAdapter,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false, // Important for mobile apps
  },
});

// Auth helper functions
export const auth = {
  signUp: async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    });
    return { data, error };
  },

  signIn: async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { data, error };
  },

  signOut: async () => {
    const { error } = await supabase.auth.signOut();
    return { error };
  },

  getCurrentUser: () => {
    return supabase.auth.getUser();
  },

  onAuthStateChange: (callback: (event: string, session: any) => void) => {
    return supabase.auth.onAuthStateChange(callback);
  },
}; 