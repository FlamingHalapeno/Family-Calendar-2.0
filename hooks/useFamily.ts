import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Alert } from 'react-native';
import { getFamilyMembers, getFamilyMembersWithUserId, removeFamilyMember } from '../services/family';
import { useAuth } from '../providers/AuthProvider';

export function useFamilyMembers() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['family-members', user?.id],
    queryFn: () => getFamilyMembersWithUserId(user!.id),
    enabled: !!user?.id,
  });
}

// Helper function that uses the user ID from context
async function getFamilyMembersWithUserIdHelper(userId: string | undefined) {
  if (!userId) {
    throw new Error('User ID not available');
  }
  
  console.log('Using user ID from context:', userId);
  
  return getFamilyMembersWithUserId(userId);
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
      Alert.alert('Error', error.message || 'Failed to remove family member.');
    },
  });
} 