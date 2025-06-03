import React, { createContext, useReducer, useEffect, ReactNode, Dispatch } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { AuthState, AuthAction, UserProfile } from '../types';
import { getProfile } from '../services/profile-service';

const initialState: AuthState = {
  user: null,
  session: null,
  profile: null,
  isLoading: true, // Start with loading true until initial auth state is determined
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
        ...initialState, // Reset to initial state but keep isInitialized true
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
  // We can add specific auth functions here later if needed (e.g., signIn, signOut, signUp)
  // For now, dispatching actions directly or via useAuth hook should suffice.
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps): React.JSX.Element {
  const [state, dispatch] = useReducer(authReducer, initialState);

  useEffect(() => {
    const fetchUserAndProfile = async (user: User | null, session: Session | null) => {
      if (user) {
        const userProfile = await getProfile(user.id);
        dispatch({ type: 'INITIALIZE_AUTH', session, user, profile: userProfile });
      } else {
        dispatch({ type: 'INITIALIZE_AUTH', session: null, user: null, profile: null });
      }
    };

    // Check initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      const user = session?.user ?? null;
      fetchUserAndProfile(user, session);
    }).catch(error => {
      console.error("Error fetching initial session:", error);
      dispatch({ type: 'INITIALIZE_AUTH', session: null, user: null, profile: null });
    });

    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        console.log('onAuthStateChange event:', _event, 'session status:', session ? 'exists' : 'null');
        const currentUser = session?.user ?? null;
        let userProfile: UserProfile | null = null;

        if (currentUser) {
          // Avoid fetching profile again if already fetched and user hasn't changed
          // This check might be too simplistic if profile updates frequently outside auth events
          if (state.user?.id !== currentUser.id || !state.profile) {
            dispatch({ type: 'SET_LOADING', isLoading: true }); // Set loading before async profile fetch
            userProfile = await getProfile(currentUser.id);
          } else {
            userProfile = state.profile; // Use existing profile
          }
        } else {
           dispatch({ type: 'SET_LOADING', isLoading: true }); // Handles case of user becoming null
        }
        

        switch (_event) {
          case 'INITIAL_SESSION':
            // This case might be redundant if getSession() promise above resolves first,
            // but it's a good fallback.
            // The user and profile are already part of the session object or fetched if currentUser exists.
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
            // For other events or if no specific action is taken, ensure loading is false.
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
  // state.user and state.profile added to dependency array to re-evaluate if they change.
  // This helps if the profile is updated elsewhere and needs to be refetched.
  // However, be cautious as this could lead to loops if not managed carefully with loading states.
  // For now, sticking with an empty array to mimic initial behavior of onMount only.
  }, []);


  return (
    <AuthContext.Provider value={{ ...state, dispatch }}>
      {children}
    </AuthContext.Provider>
  );
} 