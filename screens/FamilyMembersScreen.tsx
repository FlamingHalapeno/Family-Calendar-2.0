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
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useFamilyMembers, useGenerateInviteCode, useCurrentUserFamilyId } from '../hooks/useFamily';
import { FamilyMember } from '../types/family';

export function FamilyMembersScreen() {
  const navigation = useNavigation();
  const { data: familyMembers, isLoading, error } = useFamilyMembers();
  const { data: familyId } = useCurrentUserFamilyId();
  const [showAddModal, setShowAddModal] = useState(false);
  const [inviteCode, setInviteCode] = useState<string | null>(null);

  const generateInviteCodeMutation = useGenerateInviteCode();

  const handleGenerateCode = async () => {
    if (!familyId) {
      Alert.alert('Error', 'Could not determine the family to invite to.');
      return;
    }

    generateInviteCodeMutation.mutate(familyId, {
      onSuccess: (code) => {
        setInviteCode(code);
      },
    });
  };

  const renderMember = ({ item }: { item: FamilyMember }) => (
    <View style={styles.memberCard}>
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
          <Text style={styles.memberEmail}>{item.email}</Text>
          <Text style={styles.memberRole}>{item.role}</Text>
        </View>
      </View>
    </View>
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
          <Text style={styles.loadingText}>Loading family members...</Text>
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
        <Text style={styles.title}>Family Members</Text>
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
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => {
              setInviteCode(null); // Reset code when opening modal
              setShowAddModal(true);
            }}
            activeOpacity={0.7}
          >
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
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Add Family Member</Text>

            <TouchableOpacity
              style={[styles.modalButton, generateInviteCodeMutation.isPending && styles.disabledButton]}
              onPress={handleGenerateCode}
              disabled={generateInviteCodeMutation.isPending}
              activeOpacity={0.7}
            >
              {generateInviteCodeMutation.isPending ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.modalButtonText}>Invite with Code</Text>
              )}
            </TouchableOpacity>

            {inviteCode && (
              <View style={styles.inviteCodeContainer}>
                <Text style={styles.inviteCodeLabel}>Share this code:</Text>
                <View style={styles.codeBox}>
                  <Text style={styles.inviteCode}>{inviteCode}</Text>
                  <TouchableOpacity onPress={() => {
                      Clipboard.setString(inviteCode);
                      Alert.alert("Copied!", "Invite code copied to clipboard.");
                  }}>
                    <Text style={styles.copyButton}>COPY</Text>
                  </TouchableOpacity>
                </View>
                <Text style={styles.expiresText}>This code expires in 24 hours.</Text>
              </View>
            )}

            <TouchableOpacity
              style={styles.modalCancelButton}
              onPress={() => setShowAddModal(false)}
              activeOpacity={0.7}
            >
              <Text style={styles.modalCancelButtonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
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
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 15,
    color: '#000000',
  },
  memberCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F2F2F7',
  },
  memberInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#007AFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 15,
  },
  avatarText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  memberDetails: {
    flex: 1,
  },
  memberName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
    color: '#000000',
  },
  memberEmail: {
    fontSize: 14,
    color: '#6D6D72',
    marginBottom: 2,
  },
  memberRole: {
    fontSize: 12,
    color: '#007AFF',
    textTransform: 'capitalize',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    color: '#6D6D72',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    color: '#FF3B30',
    fontSize: 16,
  },
  noMembersText: {
    color: '#6D6D72',
    textAlign: 'center',
    fontStyle: 'italic',
  },
  addButton: {
    backgroundColor: '#007AFF',
    borderRadius: 8,
    padding: 15,
    alignItems: 'center',
  },
  addButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 24,
    marginHorizontal: 20,
    width: '80%',
    maxWidth: 300,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000000',
    textAlign: 'center',
    marginBottom: 20,
  },
  modalButton: {
    backgroundColor: '#007AFF',
    borderRadius: 8,
    padding: 15,
    alignItems: 'center',
    marginBottom: 12,
  },
  modalButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  modalCancelButton: {
    backgroundColor: '#F2F2F7',
    borderRadius: 8,
    padding: 15,
    alignItems: 'center',
    marginTop: 8,
  },
  modalCancelButtonText: {
    color: '#007AFF',
    fontSize: 16,
    fontWeight: '600',
  },
  disabledButton: {
    backgroundColor: '#C7C7CC',
  },
  inviteCodeContainer: {
    marginTop: 20,
    alignItems: 'center',
  },
  inviteCodeLabel: {
    fontSize: 14,
    color: '#6D6D72',
    marginBottom: 8,
  },
  codeBox: {
    backgroundColor: '#F2F2F7',
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 15,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
  },
  inviteCode: {
    fontSize: 24,
    fontWeight: 'bold',
    letterSpacing: 3,
    color: '#000',
  },
  copyButton: {
    fontSize: 14,
    fontWeight: '600',
    color: '#007AFF',
    marginLeft: 15,
  },
  expiresText: {
    fontSize: 12,
    color: '#8E8E93',
    marginTop: 8,
  },
});
