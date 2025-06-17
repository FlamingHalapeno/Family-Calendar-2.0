import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useAuth } from '../hooks/use-auth';
import { useFamilyMembers, useCurrentUserFamilyId, useRemoveFamilyMemberAdvanced, useDisbandFamily, useLeaveFamily, usePromoteFamilyMember, useDemoteFamilyMember } from '../hooks/useFamily';
import { FamilyMember } from '../types/family';

interface RouteParams {
  member: FamilyMember;
}

export function FamilyMemberDetailScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { member } = route.params as RouteParams;
  const { user } = useAuth();
  const { data: familyMembers } = useFamilyMembers();
  const { data: familyId } = useCurrentUserFamilyId();
  
  const removeMemberMutation = useRemoveFamilyMemberAdvanced();
  const disbandFamilyMutation = useDisbandFamily();
  const leaveFamilyMutation = useLeaveFamily();
  const promoteMemberMutation = usePromoteFamilyMember();
  const demoteMemberMutation = useDemoteFamilyMember();
  
  const [isLoading, setIsLoading] = useState(false);

  // Check if current user is admin
  const currentUserMember = familyMembers?.find(m => m.id === user?.id);
  const isAdmin = currentUserMember?.role === 'admin';
  const isViewingSelf = member.id === user?.id;
  const isMemberNonAdmin = currentUserMember?.role === 'member';

  const handleRemoveMember = () => {
    if (!familyId) {
      Alert.alert('Error', 'Could not determine family ID');
      return;
    }

    Alert.alert(
      'Remove Family Member',
      `Are you sure you want to remove ${member.first_name} ${member.last_name} from the family?${
        !member.email ? ' This will permanently delete their account.' : ''
      }`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => {
            setIsLoading(true);
            removeMemberMutation.mutate(
              { memberUserId: member.id, familyId },
              {
                onSuccess: (result) => {
                  setIsLoading(false);
                  Alert.alert(
                    'Success',
                    `${member.first_name} has been removed from the family.${
                      result.managedAccountDeleted ? ' Their account has been deleted.' : ''
                    }`,
                    [{ text: 'OK', onPress: () => navigation.navigate('FamilyMembers' as never) }]
                  );
                },
                onError: () => {
                  setIsLoading(false);
                },
              }
            );
          },
        },
      ]
    );
  };

  const handleDisbandFamily = () => {
    if (!familyId) {
      Alert.alert('Error', 'Could not determine family ID');
      return;
    }

    Alert.alert(
      'Disband Family',
      'Are you sure you want to disband this family? This will:\n\n• Remove all family members\n• Delete all family data (events, tasks, notes, contacts)\n• Permanently delete managed accounts\n• Delete the family entirely\n\nThis action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Disband Family',
          style: 'destructive',
          onPress: () => {
            setIsLoading(true);
            disbandFamilyMutation.mutate(
              { familyId },
              {
                onSuccess: (result) => {
                  setIsLoading(false);
                  Alert.alert(
                    'Family Disbanded',
                    `The family has been successfully disbanded.${
                      result.managedAccountsDeleted > 0
                        ? ` ${result.managedAccountsDeleted} managed account${
                            result.managedAccountsDeleted > 1 ? 's have' : ' has'
                          } been deleted.`
                        : ''
                    }`,
                    [
                      {
                        text: 'OK',
                        onPress: () => {
                          // Navigate back to settings or home
                          navigation.navigate('Settings' as never);
                        },
                      },
                    ]
                  );
                },
                onError: () => {
                  setIsLoading(false);
                },
              }
            );
          },
        },
      ]
    );
  };

  const handleLeaveFamily = () => {
    if (!familyId || !user?.id) {
      Alert.alert('Error', 'Could not determine family or user ID');
      return;
    }

    Alert.alert(
      'Leave Family',
      'Are you sure you want to leave this family? You will lose access to all family data (events, tasks, notes, contacts) and will need an invitation to rejoin.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Leave Family',
          style: 'destructive',
          onPress: () => {
            setIsLoading(true);
            leaveFamilyMutation.mutate(
              { userId: user.id, familyId },
              {
                onSuccess: () => {
                  setIsLoading(false);
                  Alert.alert(
                    'Left Family',
                    'You have successfully left the family.',
                    [
                      {
                        text: 'OK',
                        onPress: () => {
                          // Navigate back to settings
                          navigation.navigate('Settings' as never);
                        },
                      },
                    ]
                  );
                },
                onError: () => {
                  setIsLoading(false);
                },
              }
            );
          },
        },
      ]
    );
  };

  const handlePromoteMember = () => {
    if (!familyId) {
      Alert.alert('Error', 'Could not determine family ID');
      return;
    }

    Alert.alert(
      'Promote to Admin',
      `Are you sure you want to promote ${member.first_name} ${member.last_name} to admin? They will have full access to manage family members and settings.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Promote',
          onPress: () => {
            setIsLoading(true);
            promoteMemberMutation.mutate(
              { memberUserId: member.id, familyId },
              {
                onSuccess: () => {
                  setIsLoading(false);
                  Alert.alert(
                    'Success',
                    `${member.first_name} has been promoted to admin.`,
                    [{ text: 'OK', onPress: () => navigation.navigate('FamilyMembers' as never) }]
                  );
                },
                onError: () => {
                  setIsLoading(false);
                },
              }
            );
          },
        },
      ]
    );
  };

  const handleDemoteMember = () => {
    if (!familyId) {
      Alert.alert('Error', 'Could not determine family ID');
      return;
    }

    Alert.alert(
      'Demote to Member',
      `Are you sure you want to demote ${member.first_name} ${member.last_name} from admin to regular member? They will lose admin privileges.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Demote',
          style: 'destructive',
          onPress: () => {
            setIsLoading(true);
            demoteMemberMutation.mutate(
              { memberUserId: member.id, familyId },
              {
                onSuccess: () => {
                  setIsLoading(false);
                  Alert.alert(
                    'Success',
                    `${member.first_name} has been demoted to regular member.`,
                    [{ text: 'OK', onPress: () => navigation.navigate('FamilyMembers' as never) }]
                  );
                },
                onError: () => {
                  setIsLoading(false);
                },
              }
            );
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.navigate('FamilyMembers' as never)}>
          <Text style={styles.backButtonText}>‹ Family Members</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Member Details</Text>
      </View>

      <View style={styles.content}>
        <View style={styles.card}>
          <View style={styles.memberHeader}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>
                {member.first_name?.[0]?.toUpperCase() || '?'}
              </Text>
            </View>
            <View style={styles.memberInfo}>
              <Text style={styles.memberName}>
                {member.first_name} {member.last_name}
              </Text>
              {member.email ? (
                <Text style={styles.memberEmail}>{member.email}</Text>
              ) : (
                <Text style={styles.managedAccountText}>Managed Account</Text>
              )}
              <Text style={styles.memberRole}>{member.role}</Text>
            </View>
          </View>
        </View>

        {isAdmin && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Admin Actions</Text>
            
            {isViewingSelf ? (
              <TouchableOpacity
                style={[styles.actionButton, styles.disbandButton, isLoading && styles.disabledButton]}
                onPress={handleDisbandFamily}
                disabled={isLoading}
              >
                {isLoading ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.actionButtonText}>Disband Family</Text>
                )}
              </TouchableOpacity>
            ) : (
              <>
                {/* Promote button - show for non-admin, non-managed accounts */}
                {member.role !== 'admin' && member.email && member.email.trim() !== '' && !member.email.includes('@local.app') && (
                  <TouchableOpacity
                    style={[styles.actionButton, styles.promoteButton, isLoading && styles.disabledButton]}
                    onPress={handlePromoteMember}
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <ActivityIndicator color="#FFFFFF" />
                    ) : (
                      <Text style={styles.actionButtonText}>Promote to Admin</Text>
                    )}
                  </TouchableOpacity>
                )}

                {/* Demote button - show for other admins */}
                {member.role === 'admin' && (
                  <TouchableOpacity
                    style={[styles.actionButton, styles.demoteButton, isLoading && styles.disabledButton]}
                    onPress={handleDemoteMember}
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <ActivityIndicator color="#FFFFFF" />
                    ) : (
                      <Text style={styles.actionButtonText}>Demote to Member</Text>
                    )}
                  </TouchableOpacity>
                )}

                <TouchableOpacity
                  style={[styles.actionButton, styles.removeButton, isLoading && styles.disabledButton]}
                  onPress={handleRemoveMember}
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <ActivityIndicator color="#FFFFFF" />
                  ) : (
                    <Text style={styles.actionButtonText}>Remove from Family</Text>
                  )}
                </TouchableOpacity>
              </>
            )}
          </View>
        )}

        {isMemberNonAdmin && isViewingSelf && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Member Actions</Text>
            <TouchableOpacity
              style={[styles.actionButton, styles.leaveButton, isLoading && styles.disabledButton]}
              onPress={handleLeaveFamily}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.actionButtonText}>Leave Family</Text>
              )}
            </TouchableOpacity>
          </View>
        )}

        {!isAdmin && !isViewingSelf && (
          <View style={styles.card}>
            <Text style={styles.infoText}>
              Only family admins can manage family members.
            </Text>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2F2F7',
  },
  header: {
    marginHorizontal: 20,
    marginTop: 10,
    marginBottom: 20,
  },
  backButton: {
    marginBottom: 10,
  },
  backButtonText: {
    fontSize: 17,
    color: '#007AFF',
  },
  title: {
    fontSize: 34,
    fontWeight: 'bold',
    color: '#000000',
  },
  content: {
    paddingHorizontal: 20,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    padding: 20,
    marginBottom: 20,
  },
  memberHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#007AFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 20,
  },
  avatarText: {
    color: '#FFFFFF',
    fontSize: 32,
    fontWeight: 'bold',
  },
  memberInfo: {
    flex: 1,
  },
  memberName: {
    fontSize: 24,
    fontWeight: '600',
    marginBottom: 4,
    color: '#000000',
  },
  memberEmail: {
    fontSize: 16,
    color: '#6D6D72',
    marginBottom: 4,
  },
  managedAccountText: {
    fontSize: 16,
    color: '#FF9500',
    fontStyle: 'italic',
    marginBottom: 4,
  },
  memberRole: {
    fontSize: 14,
    color: '#007AFF',
    textTransform: 'capitalize',
    fontWeight: '500',
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 15,
    color: '#000000',
  },
  actionButton: {
    borderRadius: 8,
    padding: 15,
    alignItems: 'center',
  },
  removeButton: {
    backgroundColor: '#FF3B30',
  },
  disbandButton: {
    backgroundColor: '#FF3B30',
  },
  leaveButton: {
    backgroundColor: '#FF9500',
  },
  promoteButton: {
    backgroundColor: '#34C759',
    marginBottom: 10,
  },
  demoteButton: {
    backgroundColor: '#FF9500',
    marginBottom: 10,
  },
  actionButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  disabledButton: {
    backgroundColor: '#C7C7CC',
  },
  infoText: {
    fontSize: 16,
    color: '#6D6D72',
    textAlign: 'center',
    fontStyle: 'italic',
  },
}); 