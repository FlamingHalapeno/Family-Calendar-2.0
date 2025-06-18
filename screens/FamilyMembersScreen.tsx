import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  FlatList,
  ActivityIndicator,
  Modal,
  Alert,
  Clipboard,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useFamilyMembers, useGenerateInviteCode, useCurrentUserFamilyId, useAddManagedFamilyMember } from '../hooks/useFamily';
import { FamilyMember } from '../types/family';
import { useAuth } from '../hooks/use-auth';

export function FamilyMembersScreen() {
  const navigation = useNavigation();
  const { user } = useAuth();
  const { data: familyMembers, isLoading, error, refetch } = useFamilyMembers();
  const { data: familyId } = useCurrentUserFamilyId();
  
  const [showAddModal, setShowAddModal] = useState(false);
  const [modalView, setModalView] = useState<'invite' | 'manual'>('invite');

  // State for invite code
  const [inviteCode, setInviteCode] = useState<string | null>(null);
  const generateInviteCodeMutation = useGenerateInviteCode();
  
  // State for manual add
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const addManagedMemberMutation = useAddManagedFamilyMember();
  
  // State for refresh
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleGenerateCode = async () => {
    if (!familyId || !user?.id) {
      Alert.alert('Error', 'Could not determine the family or user to create an invite.');
      return;
    }

    generateInviteCodeMutation.mutate({ familyId, creatorId: user.id }, {
      onSuccess: (code) => setInviteCode(code),
    });
  };

  const handleAddManagedMember = () => {
    if (!familyId) {
      Alert.alert('Error', 'Cannot determine your family.');
      return;
    }
    if (!firstName.trim() || !lastName.trim()) {
      Alert.alert('Validation Error', 'Please enter both first and last name.');
      return;
    }
    addManagedMemberMutation.mutate({ familyId, firstName: firstName.trim(), lastName: lastName.trim() }, {
      onSuccess: () => {
        Alert.alert('Success', `${firstName.trim()} has been added to the family.`);
        setShowAddModal(false);
      }
    });
  };
  
  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await refetch();
    } finally {
      setIsRefreshing(false);
    }
  };

  const openModal = () => {
    setInviteCode(null);
    setFirstName('');
    setLastName('');
    setModalView('invite');
    setShowAddModal(true);
  };

  const renderMember = ({ item }: { item: FamilyMember }) => (
    <TouchableOpacity 
      style={styles.memberCard}
      onPress={() => (navigation as any).navigate('FamilyMemberDetail', { member: item })}
      activeOpacity={0.7}
    >
      <View style={styles.memberInfo}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {item.first_name?.[0]?.toUpperCase() || '?'}
          </Text>
        </View>
        <View style={styles.memberDetails}>
          <Text style={styles.memberName}>
            {item.first_name} {item.last_name}
          </Text>
          <Text style={styles.memberEmail}>{item.email || 'Managed Account'}</Text>
          <Text style={styles.memberRole}>{item.role}</Text>
        </View>
      </View>
      <Text style={styles.chevron}>›</Text>
    </TouchableOpacity>
  );

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
            <Text style={styles.backButtonText}>‹ Settings</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Family Members</Text>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
            <Text style={styles.backButtonText}>‹ Settings</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Family Members</Text>
        </View>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Error loading family members</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Text style={styles.backButtonText}>‹ Settings</Text>
        </TouchableOpacity>
        <View style={styles.titleContainer}>
          <Text style={styles.title}>Family Members</Text>
          <TouchableOpacity 
            style={[styles.refreshButton, isRefreshing && styles.refreshButtonLoading]} 
            onPress={handleRefresh}
            disabled={isRefreshing}
          >
            {isRefreshing ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Text style={styles.refreshButtonText}>↻</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.content}>
        <View style={styles.card}>
          {familyMembers && familyMembers.length > 0 ? (
            <FlatList
              data={familyMembers}
              renderItem={renderMember}
              keyExtractor={(item) => item.id}
              showsVerticalScrollIndicator={false}
            />
          ) : (
            <Text style={styles.noMembersText}>No family members found.</Text>
          )}
        </View>

        <View style={styles.card}>
          <TouchableOpacity style={styles.addButton} onPress={openModal} activeOpacity={0.7}>
            <Text style={styles.addButtonText}>+ Add Family Member</Text>
          </TouchableOpacity>
        </View>
      </View>

      <Modal
        visible={showAddModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowAddModal(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add Family Member</Text>
              <TouchableOpacity 
                style={styles.closeIcon}
                onPress={() => setShowAddModal(false)}
              >
                <Text style={styles.closeIconText}>×</Text>
              </TouchableOpacity>
            </View>

            {modalView === 'invite' ? (
              <View style={styles.modalBody}>
                <View style={styles.optionCard}>
                  <Text style={styles.optionIcon}>👥</Text>
                  <Text style={styles.optionTitle}>Invite with Code</Text>
                  <Text style={styles.optionDescription}>
                    Generate a code for family members to join with their own account
                  </Text>
                  <TouchableOpacity
                    style={[styles.primaryButton, generateInviteCodeMutation.isPending && styles.disabledButton]}
                    onPress={handleGenerateCode}
                    disabled={generateInviteCodeMutation.isPending}
                  >
                    {generateInviteCodeMutation.isPending ? 
                      <ActivityIndicator color="#FFFFFF" size="small" /> : 
                      <Text style={styles.primaryButtonText}>Generate Invite Code</Text>
                    }
                  </TouchableOpacity>
                </View>

                {inviteCode && (
                  <View style={styles.inviteCodeCard}>
                    <Text style={styles.inviteCodeLabel}>Share this code:</Text>
                    <View style={styles.codeBox}>
                      <Text style={styles.inviteCode}>{inviteCode}</Text>
                      <TouchableOpacity 
                        style={styles.copyButtonContainer}
                        onPress={() => { 
                          Clipboard.setString(inviteCode); 
                          Alert.alert("Copied!", "Invite code copied to clipboard"); 
                        }}
                      >
                        <Text style={styles.copyButton}>📋</Text>
                      </TouchableOpacity>
                    </View>
                    <Text style={styles.expiresText}>⏰ This code expires in 24 hours</Text>
                  </View>
                )}

                <View style={styles.divider}>
                  <View style={styles.dividerLine} />
                  <Text style={styles.dividerText}>OR</Text>
                  <View style={styles.dividerLine} />
                </View>

                <TouchableOpacity 
                  style={styles.secondaryButton} 
                  onPress={() => setModalView('manual')}
                >
                  <Text style={styles.secondaryButtonText}>Add Member Manually</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.modalBody}>
                <View style={styles.optionCard}>
                  <Text style={styles.optionIcon}>👶</Text>
                  <Text style={styles.optionTitle}>Add Manually</Text>
                  <Text style={styles.optionDescription}>
                    For children or family members without email accounts
                  </Text>
                  <TextInput 
                    style={styles.modalInput} 
                    placeholder="First Name" 
                    value={firstName} 
                    onChangeText={setFirstName} 
                    autoCapitalize="words"
                    placeholderTextColor="#8E8E93"
                  />
                  <TextInput 
                    style={styles.modalInput} 
                    placeholder="Last Name" 
                    value={lastName} 
                    onChangeText={setLastName} 
                    autoCapitalize="words"
                    placeholderTextColor="#8E8E93"
                  />
                  <TouchableOpacity
                    style={[styles.primaryButton, addManagedMemberMutation.isPending && styles.disabledButton]}
                    onPress={handleAddManagedMember}
                    disabled={addManagedMemberMutation.isPending}
                  >
                    {addManagedMemberMutation.isPending ? 
                      <ActivityIndicator color="#FFFFFF" size="small" /> : 
                      <Text style={styles.primaryButtonText}>Add Member</Text>
                    }
                  </TouchableOpacity>
                </View>

                <View style={styles.divider}>
                  <View style={styles.dividerLine} />
                  <Text style={styles.dividerText}>OR</Text>
                  <View style={styles.dividerLine} />
                </View>

                <TouchableOpacity 
                  style={styles.secondaryButton} 
                  onPress={() => setModalView('invite')}
                >
                  <Text style={styles.secondaryButtonText}>Invite with Code Instead</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F2F2F7' },
  header: { marginHorizontal: 20, marginTop: 10, marginBottom: 20 },
  backButton: { marginBottom: 10 },
  backButtonText: { fontSize: 17, color: '#007AFF' },
  titleContainer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { fontSize: 34, fontWeight: 'bold', color: '#000000' },
  refreshButton: { 
    backgroundColor: '#007AFF', 
    borderRadius: 20, 
    width: 40, 
    height: 40, 
    alignItems: 'center', 
    justifyContent: 'center' 
  },
  refreshButtonText: { fontSize: 18, color: '#FFFFFF', fontWeight: '600' },
  refreshButtonLoading: { opacity: 0.6 },
  content: { paddingHorizontal: 20 },
  card: { backgroundColor: '#FFFFFF', borderRadius: 10, padding: 20, marginBottom: 20 },
  memberCard: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F2F2F7' },
  memberInfo: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  avatar: { width: 50, height: 50, borderRadius: 25, backgroundColor: '#007AFF', alignItems: 'center', justifyContent: 'center', marginRight: 15 },
  avatarText: { color: '#FFFFFF', fontSize: 18, fontWeight: 'bold' },
  memberDetails: { flex: 1 },
  memberName: { fontSize: 16, fontWeight: '600', marginBottom: 2, color: '#000000' },
  memberEmail: { fontSize: 14, color: '#6D6D72', marginBottom: 2 },
  memberRole: { fontSize: 12, color: '#007AFF', textTransform: 'capitalize' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  errorContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  errorText: { color: '#FF3B30', fontSize: 16 },
  noMembersText: { color: '#6D6D72', textAlign: 'center', fontStyle: 'italic' },
  addButton: { backgroundColor: '#007AFF', borderRadius: 8, padding: 15, alignItems: 'center' },
  addButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.6)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { 
    backgroundColor: '#FFFFFF', 
    borderRadius: 16, 
    marginHorizontal: 20, 
    width: '85%', 
    maxWidth: 380,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 25,
    elevation: 10,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 24,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F2F2F7',
  },
  modalTitle: { fontSize: 20, fontWeight: '600', color: '#000000' },
  closeIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F2F2F7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeIconText: { fontSize: 20, color: '#8E8E93', fontWeight: '300' },
  modalBody: { padding: 24 },
  optionCard: {
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    alignItems: 'center',
  },
  optionIcon: { fontSize: 32, marginBottom: 12 },
  optionTitle: { fontSize: 18, fontWeight: '600', color: '#000000', marginBottom: 6 },
  optionDescription: { 
    fontSize: 14, 
    color: '#6D6D72', 
    textAlign: 'center', 
    marginBottom: 20, 
    lineHeight: 20 
  },
  primaryButton: { 
    backgroundColor: '#007AFF', 
    borderRadius: 10, 
    padding: 16, 
    alignItems: 'center', 
    width: '100%',
    shadowColor: '#007AFF',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  primaryButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },
  secondaryButton: {
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: '#007AFF',
    borderRadius: 10,
    padding: 16,
    alignItems: 'center',
    width: '100%',
  },
  secondaryButtonText: { color: '#007AFF', fontSize: 16, fontWeight: '600' },
  disabledButton: { backgroundColor: '#C7C7CC' },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 20,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#E5E5E7',
  },
  dividerText: {
    marginHorizontal: 16,
    fontSize: 12,
    color: '#8E8E93',
    fontWeight: '500',
  },
  inviteCodeCard: { 
    backgroundColor: '#E3F2FD',
    borderRadius: 12,
    padding: 16,
    marginTop: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#BBDEFB',
  },
  inviteCodeLabel: { fontSize: 14, color: '#1976D2', marginBottom: 12, fontWeight: '500' },
  codeBox: { 
    backgroundColor: '#FFFFFF', 
    borderRadius: 10, 
    paddingVertical: 12, 
    paddingHorizontal: 16, 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between', 
    width: '100%',
    borderWidth: 2,
    borderColor: '#007AFF',
    borderStyle: 'dashed',
  },
  inviteCode: { fontSize: 24, fontWeight: 'bold', letterSpacing: 4, color: '#007AFF', flex: 1, textAlign: 'center' },
  copyButtonContainer: {
    backgroundColor: '#007AFF',
    borderRadius: 6,
    padding: 8,
    marginLeft: 12,
  },
  copyButton: { fontSize: 16 },
  expiresText: { fontSize: 12, color: '#1976D2', marginTop: 8, fontWeight: '500' },
  modalInput: { 
    backgroundColor: '#FFFFFF', 
    borderWidth: 1.5,
    borderColor: '#E5E5E7',
    borderRadius: 10, 
    padding: 16, 
    fontSize: 16, 
    marginBottom: 16,
    width: '100%',
  },
  chevron: { fontSize: 18, color: '#C7C7CC', marginLeft: 10 },
});
