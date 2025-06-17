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
            <Text style={styles.modalTitle}>Add Family Member</Text>

            {modalView === 'invite' ? (
              <>
                <TouchableOpacity
                  style={[styles.modalButton, generateInviteCodeMutation.isPending && styles.disabledButton]}
                  onPress={handleGenerateCode}
                  disabled={generateInviteCodeMutation.isPending}
                >
                  {generateInviteCodeMutation.isPending ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.modalButtonText}>Invite with Code</Text>}
                </TouchableOpacity>

                {inviteCode && (
                  <View style={styles.inviteCodeContainer}>
                    <Text style={styles.inviteCodeLabel}>Share this code:</Text>
                    <View style={styles.codeBox}>
                      <Text style={styles.inviteCode}>{inviteCode}</Text>
                      <TouchableOpacity onPress={() => { Clipboard.setString(inviteCode); Alert.alert("Copied!"); }}>
                        <Text style={styles.copyButton}>COPY</Text>
                      </TouchableOpacity>
                    </View>
                    <Text style={styles.expiresText}>This code expires in 24 hours.</Text>
                  </View>
                )}
                 <TouchableOpacity style={styles.switchModalViewButton} onPress={() => setModalView('manual')}>
                  <Text style={styles.switchModalViewButtonText}>Add a member without an email instead?</Text>
                </TouchableOpacity>
              </>
            ) : (
              <>
                <Text style={styles.modalSubtitle}>For members without an email, like children.</Text>
                <TextInput style={styles.modalInput} placeholder="First Name" value={firstName} onChangeText={setFirstName} autoCapitalize="words" />
                <TextInput style={styles.modalInput} placeholder="Last Name" value={lastName} onChangeText={setLastName} autoCapitalize="words" />
                <TouchableOpacity
                  style={[styles.modalButton, addManagedMemberMutation.isPending && styles.disabledButton]}
                  onPress={handleAddManagedMember}
                  disabled={addManagedMemberMutation.isPending}
                >
                  {addManagedMemberMutation.isPending ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.modalButtonText}>Add Member</Text>}
                </TouchableOpacity>
                 <TouchableOpacity style={styles.switchModalViewButton} onPress={() => setModalView('invite')}>
                    <Text style={styles.switchModalViewButtonText}>Want to invite with a code instead?</Text>
                </TouchableOpacity>
              </>
            )}

            <TouchableOpacity style={styles.modalCancelButton} onPress={() => setShowAddModal(false)}>
              <Text style={styles.modalCancelButtonText}>Close</Text>
            </TouchableOpacity>
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
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.5)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { backgroundColor: '#FFFFFF', borderRadius: 12, padding: 24, marginHorizontal: 20, width: '85%', maxWidth: 320 },
  modalTitle: { fontSize: 18, fontWeight: '600', color: '#000000', textAlign: 'center', marginBottom: 20 },
  modalButton: { backgroundColor: '#007AFF', borderRadius: 8, padding: 15, alignItems: 'center', marginBottom: 12 },
  modalButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },
  modalCancelButton: { backgroundColor: '#F2F2F7', borderRadius: 8, padding: 15, alignItems: 'center', marginTop: 8 },
  modalCancelButtonText: { color: '#007AFF', fontSize: 16, fontWeight: '600' },
  disabledButton: { backgroundColor: '#C7C7CC' },
  inviteCodeContainer: { marginTop: 20, alignItems: 'center' },
  inviteCodeLabel: { fontSize: 14, color: '#6D6D72', marginBottom: 8 },
  codeBox: { backgroundColor: '#F2F2F7', borderRadius: 8, paddingVertical: 10, paddingHorizontal: 15, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', width: '100%' },
  inviteCode: { fontSize: 24, fontWeight: 'bold', letterSpacing: 3, color: '#000' },
  copyButton: { fontSize: 14, fontWeight: '600', color: '#007AFF', marginLeft: 15 },
  expiresText: { fontSize: 12, color: '#8E8E93', marginTop: 8 },
  modalSubtitle: { fontSize: 14, color: '#6D6D72', textAlign: 'center', marginBottom: 20 },
  modalInput: { backgroundColor: '#F2F2F7', borderRadius: 8, padding: 15, fontSize: 16, marginBottom: 15 },
  switchModalViewButton: { marginTop: 12, padding: 4 },
  switchModalViewButtonText: { color: '#007AFF', textAlign: 'center', fontSize: 14 },
  chevron: { fontSize: 18, color: '#C7C7CC', marginLeft: 10 },
});
