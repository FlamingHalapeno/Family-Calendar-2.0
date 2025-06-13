import React from 'react';
import { render } from '@testing-library/react-native';
import { AuthProvider } from '../../providers/AuthProvider';
import { useAuth } from '../../hooks/use-auth';
import { Text } from 'react-native';

// Mock Supabase
jest.mock('../../lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: jest.fn().mockResolvedValue({ data: { session: null } }),
      onAuthStateChange: jest.fn().mockReturnValue({
        data: { subscription: { unsubscribe: jest.fn() } }
      }),
      signInWithPassword: jest.fn(),
      signUp: jest.fn(),
      signOut: jest.fn(),
    },
  },
}));

// Mock profile service
jest.mock('../../services/profile-service', () => ({
  getUserProfile: jest.fn().mockResolvedValue(null),
}));

// Test component that uses useAuth
function TestComponent() {
  const { user, isLoading, signIn, signUp, signOut } = useAuth();
  
  return (
    <Text testID="auth-status">
      {isLoading ? 'Loading' : user ? 'Authenticated' : 'Not authenticated'}
    </Text>
  );
}

describe('useAuth Hook', () => {
  it('should provide auth context when wrapped in AuthProvider', () => {
    const { getByTestId } = render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    // Should render without throwing an error
    expect(getByTestId('auth-status')).toBeTruthy();
  });

  it('should throw error when used outside AuthProvider', () => {
    // Mock console.error to avoid noise in test output
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    
    expect(() => {
      render(<TestComponent />);
    }).toThrow('useAuth must be used within an AuthProvider');

    consoleSpy.mockRestore();
  });

  it('should provide all required auth methods', () => {
    let authMethods: any;
    
    function TestMethodsComponent() {
      authMethods = useAuth();
      return <Text>Test</Text>;
    }

    render(
      <AuthProvider>
        <TestMethodsComponent />
      </AuthProvider>
    );

    expect(authMethods).toHaveProperty('user');
    expect(authMethods).toHaveProperty('session');
    expect(authMethods).toHaveProperty('profile');
    expect(authMethods).toHaveProperty('isLoading');
    expect(authMethods).toHaveProperty('error');
    expect(authMethods).toHaveProperty('isInitialized');
    expect(authMethods).toHaveProperty('signIn');
    expect(authMethods).toHaveProperty('signUp');
    expect(authMethods).toHaveProperty('signOut');
    expect(authMethods).toHaveProperty('dispatch');
  });
});
