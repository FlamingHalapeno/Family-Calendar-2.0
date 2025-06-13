import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Alert } from 'react-native';
import { getFamilyMembersWithUserId, removeFamilyMember, createFamily } from '../services/family';
import { useAuth } from './use-auth';
import { AppErrorHandler } from '../utils/error-handler';

export function useFamilyMembers() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['family-members', user?.id],
    queryFn: () => getFamilyMembersWithUserId(user!.id),
    enabled: !!user?.id,
  });
}



export function useRemoveFamilyMember() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: removeFamilyMember,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['family-members', user?.id] });
    },
    onError: (error: Error) => {
      const appError = AppErrorHandler.handleError(error);
      Alert.alert('Error', appError.message);
    },
  });
}

export function useCreateFamily() {
  const queryClient = useQueryClient();
  const { user } = useAuth(); // Get the authenticated user from the context

  return useMutation({
    mutationFn: ({ familyName, familyDescription }: { familyName: string, familyDescription: string }) => {
        // Check for the user ID before calling the service
        if (!user?.id) {
            throw new Error("Authentication error: User ID is missing.");
        }
        // Pass the user's ID to the service function
        return createFamily(user.id, familyName, familyDescription);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['family-members', user?.id] });
    },
    onError: (error: Error) => {
      // The component's onError callback will handle UI alerts
      console.error('useCreateFamily mutation error:', error);
    },
  });
}