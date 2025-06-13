import { useContext } from 'react';
import { AuthContext } from '../providers/AuthProvider';
import type { AuthState, AuthAction } from '../types';
import type { Dispatch } from 'react';

interface AuthContextType extends AuthState {
  dispatch: Dispatch<AuthAction>;
  signIn: (email: string, password: string) => Promise<{ data: any; error: any }>;
  signUp: (email: string, password: string, firstName: string, lastName: string) => Promise<{ data: any; error: any }>;
  signOut: () => Promise<{ error: any }>;
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}