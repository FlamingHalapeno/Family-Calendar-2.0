import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Alert } from 'react-native';
import { getFamilyMembersWithUserId, removeFamilyMember } from '../services/family';
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