import React, { createContext, useReducer, useEffect, ReactNode, Dispatch } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { AuthState, AuthAction, UserProfile } from '../types';
import { getUserProfile } from '../services/profile-service';

const initialState: AuthState = {
  user: null,
  session: null,
  profile: null,
  isLoading: true,
  error: null,
  isInitialized: false,
};

const authReducer = (state: AuthState, action: AuthAction): AuthState => {
  switch (action.type) {
    case 'INITIALIZE_AUTH':
      return {
        ...state,
        session: action.session,
        user: action.user,
        profile: action.profile,
        isLoading: false,
        isInitialized: true,
        error: null,
      };
    case 'LOGIN':
      return {
        ...state,
        session: action.session,
        user: action.user,
        profile: action.profile,
        isLoading: false,
        error: null,
      };
    case 'LOGOUT':
      return {
        ...initialState,
        isLoading: false,
        isInitialized: true,
      };
    case 'SET_PROFILE':
      return { ...state, profile: action.profile };
    case 'SET_LOADING':
      return { ...state, isLoading: action.isLoading };
    case 'SET_ERROR':
      return { ...state, error: action.error, isLoading: false };
    default:
      return state;
  }
};

interface AuthContextType extends AuthState {
  dispatch: Dispatch<AuthAction>;
  signIn: (email: string, password: string) => Promise<{ data: any; error: any }>;
  signUp: (email: string, password: string, firstName: string, lastName: string) => Promise<{ data: any; error: any }>;
  signOut: () => Promise<{ error: any }>;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps): React.JSX.Element {
  const [state, dispatch] = useReducer(authReducer, initialState);

  const signIn = async (email: string, password: string) => {
    dispatch({ type: 'SET_LOADING', isLoading: true });
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      
      if (error) {
        dispatch({ type: 'SET_ERROR', error });
      }
      
      return { data, error };
    } catch (error) {
      const authError = error as Error;
      dispatch({ type: 'SET_ERROR', error: authError });
      return { data: null, error: authError };
    }
  };

  const signUp = async (email: string, password: string, firstName: string, lastName: string) => {
    dispatch({ type: 'SET_LOADING', isLoading: true });
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            first_name: firstName,
            last_name: lastName,
          }
        }
      });
      
      if (error) {
        dispatch({ type: 'SET_ERROR', error });
      }
      
      return { data, error };
    } catch (error) {
      const authError = error as Error;
      dispatch({ type: 'SET_ERROR', error: authError });
      return { data: null, error: authError };
    }
  };

  const signOut = async () => {
    dispatch({ type: 'SET_LOADING', isLoading: true });
    try {
      const { error } = await supabase.auth.signOut();
      
      if (error) {
        dispatch({ type: 'SET_ERROR', error });
      }
      
      return { error };
    } catch (error) {
      const authError = error as Error;
      dispatch({ type: 'SET_ERROR', error: authError });
      return { error: authError };
    }
  };

  useEffect(() => {
    const fetchUserAndProfile = async (user: User | null, session: Session | null) => {
      try {
        if (user) {
          const userProfile = await getUserProfile(user.id);
          dispatch({ type: 'INITIALIZE_AUTH', session, user, profile: userProfile });
        } else {
          dispatch({ type: 'INITIALIZE_AUTH', session: null, user: null, profile: null });
        }
      } catch (error) {
        console.error('Error fetching user profile:', error);
        dispatch({ type: 'SET_ERROR', error: error as Error });
      }
    };

    // Check initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      const user = session?.user ?? null;
      fetchUserAndProfile(user, session);
    }).catch(error => {
      console.error('Error fetching initial session:', error);
      dispatch({ type: 'SET_ERROR', error });
    });

    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth state change:', event, session ? 'session exists' : 'no session');
        const currentUser = session?.user ?? null;
        let userProfile: UserProfile | null = null;

        if (currentUser) {
          if (state.user?.id !== currentUser.id || !state.profile) {
            dispatch({ type: 'SET_LOADING', isLoading: true });
            try {
              userProfile = await getUserProfile(currentUser.id);
            } catch (error) {
              console.error('Error fetching profile on auth change:', error);
              dispatch({ type: 'SET_ERROR', error: error as Error });
              return;
            }
          } else {
            userProfile = state.profile;
          }
        }

        switch (event) {
          case 'INITIAL_SESSION':
            dispatch({ type: 'INITIALIZE_AUTH', session, user: currentUser, profile: userProfile });
            break;
          case 'SIGNED_IN':
          case 'TOKEN_REFRESHED':
          case 'USER_UPDATED':
            dispatch({ type: 'LOGIN', session: session!, user: currentUser!, profile: userProfile });
            break;
          case 'SIGNED_OUT':
            dispatch({ type: 'LOGOUT' });
            break;
          default:
            dispatch({ type: 'SET_LOADING', isLoading: false });
            break;
        }
      }
    );

    return () => {
      if (authListener?.subscription) {
        authListener.subscription.unsubscribe();
      }
    };
  }, []);

  const value: AuthContextType = {
    ...state,
    dispatch,
    signIn,
    signUp,
    signOut,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}
