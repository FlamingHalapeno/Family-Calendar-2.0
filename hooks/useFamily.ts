import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Alert } from 'react-native';
import { getFamilyMembers, removeFamilyMember, createFamily, generateInviteCode, joinFamily, getCurrentUserFamilyId } from '../services/family';
import { useAuth } from './use-auth';
import { AppErrorHandler } from '../utils/error-handler';

export function useFamilyMembers() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['family-members', user?.id],
    queryFn: () => {
      if (!user?.id) {
        return Promise.resolve([]);
      }
      return getFamilyMembers(user.id);
    },
    enabled: !!user?.id,
  });
}

export function useCurrentUserFamilyId() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['current-user-family-id', user?.id],
    queryFn: () => {
      if (!user?.id) {
        return Promise.resolve(null);
      }
      return getCurrentUserFamilyId(user.id);
    },
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
      queryClient.invalidateQueries({ queryKey: ['current-user-family-id', user?.id] });
    },
    onError: (error: Error) => {
      // The component's onError callback will handle UI alerts
      console.error('useCreateFamily mutation error:', error);
    },
  });
}

export function useGenerateInviteCode() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ familyId, creatorId }: { familyId: string, creatorId: string }) => 
      generateInviteCode(familyId, creatorId),
    onSuccess: () => {
      // You might want to invalidate some queries here if needed
    },
    onError: (error: Error) => {
      const appError = AppErrorHandler.handleError(error);
      Alert.alert('Error Generating Code', appError.message);
    },
  });
}

export function useJoinFamily() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: ({ code, userId }: { code: string; userId: string }) => joinFamily(code, userId),
    onSuccess: () => {
      // Invalidate queries to refetch family members after joining
      queryClient.invalidateQueries({ queryKey: ['family-members', user?.id] });
      queryClient.invalidateQueries({ queryKey: ['current-user-family-id', user?.id] });
    },
    onError: (error: Error) => {
      const appError = AppErrorHandler.handleError(error);
      Alert.alert('Error Joining Family', appError.message);
    },
  });
}