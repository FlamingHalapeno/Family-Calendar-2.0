import * as React from 'react';
import * as WebBrowser from 'expo-web-browser';
import { useAuthRequest } from 'expo-auth-session/providers/google';
import { makeRedirectUri } from 'expo-auth-session';
import * as AuthSession from 'expo-auth-session';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { supabase } from '../lib/supabase';

WebBrowser.maybeCompleteAuthSession();

interface GoogleAuthState {
  isLoading: boolean;
  error: string | null;
  isAuthenticated: boolean;
}

interface GoogleAuthResult {
  success: boolean;
  error?: string;
  calendars?: any[];
}

export function useGoogleAuth() {
  const [state, setState] = React.useState<GoogleAuthState>({
    isLoading: false,
    error: null,
    isAuthenticated: false,
  });

  const isExpoGo = Constants.appOwnership === 'expo';

  const redirectUri = React.useMemo(() => {
    return makeRedirectUri({
      // In Expo Go, `useProxy` must be true. In standalone, it must be false.
      useProxy: isExpoGo,
    } as any);
  }, [isExpoGo]);

  const [request, response, promptAsync] = useAuthRequest({
    // In Expo Go, we must use the web client ID.
    // In standalone apps, we use the respective native client IDs.
    clientId: isExpoGo
      ? Constants.expoConfig?.extra?.googleClientIdWeb
      : Platform.select({
          ios: Constants.expoConfig?.extra?.googleClientIdIos,
          android: Constants.expoConfig?.extra?.googleClientIdAndroid,
        }),
    webClientId: Constants.expoConfig?.extra?.googleClientIdWeb,
    scopes: [
      'https://www.googleapis.com/auth/calendar.readonly',
      'https://www.googleapis.com/auth/calendar.events',
      'profile',
      'email',
    ],
    redirectUri,
  });

  // Debug logging
  React.useEffect(() => {
    if (request) {
      console.log('--- Google Auth Debug Info ---');
      console.log(`Running in: ${isExpoGo ? 'Expo Go' : 'Standalone'}`);
      console.log('Using Redirect URI:', request.redirectUri);
      console.log('Using Client ID:', request.clientId);
      console.log('--- End Google Auth Debug Info ---');
    }
  }, [request, isExpoGo]);

  // Handle authentication response
  React.useEffect(() => {
    if (response?.type === 'success') {
      handleAuthResponse(response.params.code);
    } else if (response?.type === 'error') {
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: response.error?.message || 'Authentication failed',
      }));
    }
  }, [response]);

  const handleAuthResponse = async (code: string) => {
    if (!code) {
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: 'No authorization code received',
      }));
      return;
    }

    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      // For the token exchange, we need to use the public-facing redirect URI if we're in Expo Go.
      const redirectUriForTokenExchange = isExpoGo
        ? `https://auth.expo.io/@${Constants.expoConfig?.owner}/${Constants.expoConfig?.slug}`
        : request?.redirectUri;
        
      console.log(`Using redirect URI for token exchange: ${redirectUriForTokenExchange}`);

      // Call Supabase Edge Function to handle token exchange
      const { data, error } = await supabase.functions.invoke('link-google-account', {
        body: {
          authorization_code: code,
          redirect_uri: redirectUriForTokenExchange,
          // If in Expo Go, the backend must use the WEB credentials.
          platform: isExpoGo ? 'web' : Platform.OS,
        },
      });

      if (error) {
        throw error;
      }

      if (data?.success) {
        setState(prev => ({
          ...prev,
          isLoading: false,
          isAuthenticated: true,
          error: null,
        }));
        return { success: true, calendars: data.calendars };
      } else {
        throw new Error(data?.error || 'Failed to link Google Calendar');
      }

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Authentication failed';
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: errorMessage,
      }));
      throw error;
    }
  };

  const linkGoogleCalendar = async (): Promise<GoogleAuthResult> => {
    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }));
      
      if (!request) {
        throw new Error('Google authentication not configured properly');
      }

      const result = await promptAsync();
      
      if (result.type === 'cancel') {
        setState(prev => ({ ...prev, isLoading: false }));
        return { success: false, error: 'Authentication cancelled' };
      }

      if (result.type === 'error') {
        const errorMessage = result.error?.message || 'Authentication failed';
        setState(prev => ({ ...prev, isLoading: false, error: errorMessage }));
        return { success: false, error: errorMessage };
      }

      // The actual token exchange is handled in the useEffect above
      // This function just triggers the OAuth flow
      return { success: true };
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Authentication failed';
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: errorMessage,
      }));
      return { success: false, error: errorMessage };
    }
  };

  const clearError = () => {
    setState(prev => ({ ...prev, error: null }));
  };

  return {
    linkGoogleCalendar,
    clearError,
    isLoading: state.isLoading,
    error: state.error,
    isAuthenticated: state.isAuthenticated,
    canMakeRequest: !!request,
  };
} 