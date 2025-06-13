import Constants from 'expo-constants';

interface AppConfig {
  supabase: {
    url: string;
    anonKey: string;
  };
  development: {
    testEmail?: string;
    testPassword?: string;
    autoLogin: boolean;
  };
  eas: {
    projectId: string;
  };
}

function getConfig(): AppConfig {
  const supabaseUrl = Constants.expoConfig?.extra?.supabaseUrl || process.env.EXPO_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = Constants.expoConfig?.extra?.supabaseAnonKey || process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;



  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      'Missing Supabase configuration. Please check your environment variables or app.json extra config.'
    );
  }

  return {
    supabase: {
      url: supabaseUrl,
      anonKey: supabaseAnonKey,
    },
    development: {
      testEmail: process.env.EXPO_PUBLIC_TEST_EMAIL,
      testPassword: process.env.EXPO_PUBLIC_TEST_PASSWORD,
      autoLogin: process.env.EXPO_PUBLIC_AUTO_LOGIN === 'true',
    },
    eas: {
      projectId: Constants.expoConfig?.extra?.eas?.projectId || process.env.EXPO_PUBLIC_EAS_PROJECT_ID || '',
    },
  };
}

export const appConfig = getConfig();
