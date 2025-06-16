import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  TextInput,
  Alert,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useCreateFamily, useJoinFamily } from '../hooks/useFamily';
import { useAuth } from '../hooks/use-auth';

export function FamilySettingsScreen() {
  const navigation = useNavigation();
  const { user } = useAuth();
  const [familyName, setFamilyName] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [showJoinModal, setShowJoinModal] = useState(false);
  const createFamilyMutation = useCreateFamily();
  const joinFamilyMutation = useJoinFamily();

  const handleCreateFamily = async () => {
    if (!familyName.trim()) {
      Alert.alert('Validation Error', 'Please enter a family name.');
      return;
    }
    createFamilyMutation.mutate(
      { familyName: familyName.trim(), familyDescription: '' },
      {
        onSuccess: () => {
          Alert.alert('Success', 'Family created successfully!');
          navigation.goBack();
        },
        onError: (error) => {
          Alert.alert('Error Creating Family', error.message);
        },
      }
    );
  };

  const handleJoinFamily = () => {
    if (!user) {
      Alert.alert('Error', 'You must be logged in to join a family.');
      return;
    }
    if (!joinCode.trim() || joinCode.trim().length !== 5) {
      Alert.alert('Validation Error', 'Please enter a 5-digit family code.');
      return;
    }
    
    joinFamilyMutation.mutate({ code: joinCode.trim(), userId: user.id }, {
      onSuccess: () => {
        Alert.alert('Success', 'You have joined the family!');
        setShowJoinModal(false);
        setJoinCode('');
        navigation.navigate('FamilyMembers' as never);
      },
      onError: (error) => {
        console.error(error);
      },
    });
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Text style={styles.backButtonText}>‹ Settings</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Family Settings</Text>
      </View>

      <View style={styles.content}>
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Create a New Family</Text>
          <TextInput
            style={styles.input}
            placeholder="Family Name (e.g., The Smiths)"
            value={familyName}
            onChangeText={setFamilyName}
          />
          <TouchableOpacity
            style={[styles.button, createFamilyMutation.isPending && styles.disabledButton]}
            onPress={handleCreateFamily}
            disabled={createFamilyMutation.isPending}
          >
            {createFamilyMutation.isPending ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>Create Family</Text>
            )}
          </TouchableOpacity>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Join an Existing Family</Text>
          <Text style={styles.infoText}>Enter a 5-digit family code to join.</Text>
          <TouchableOpacity 
            style={styles.button} 
            onPress={() => setShowJoinModal(true)}
          >
            <Text style={styles.buttonText}>Join with Code</Text>
          </TouchableOpacity>
        </View>
      </View>

      <Modal
        visible={showJoinModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowJoinModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Join Family</Text>
            <Text style={styles.modalSubtitle}>Enter the 5-digit family code</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="12345"
              value={joinCode}
              onChangeText={setJoinCode}
              keyboardType="numeric"
              maxLength={5}
              autoFocus={true}
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => {
                  setShowJoinModal(false);
                  setJoinCode('');
                }}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.joinButton, joinFamilyMutation.isPending && styles.disabledButton]}
                onPress={handleJoinFamily}
                disabled={joinFamilyMutation.isPending}
              >
                {joinFamilyMutation.isPending ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.joinButtonText}>Join</Text>
                )}
              </TouchableOpacity>
            </View>
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
  },
  content: {
    paddingHorizontal: 20,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 20,
    marginBottom: 20,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 15,
  },
  input: {
    backgroundColor: '#F2F2F7',
    borderRadius: 8,
    padding: 15,
    fontSize: 16,
    marginBottom: 15,
  },
  button: {
    backgroundColor: '#007AFF',
    borderRadius: 8,
    padding: 15,
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  disabledButton: {
    backgroundColor: '#C7C7CC',
  },
  infoText: {
    color: '#6D6D72',
    marginBottom: 15,
    textAlign: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    width: '80%',
    maxWidth: 300,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 8,
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#6D6D72',
    textAlign: 'center',
    marginBottom: 20,
  },
  modalInput: {
    backgroundColor: '#F2F2F7',
    borderRadius: 8,
    padding: 15,
    fontSize: 18,
    textAlign: 'center',
    marginBottom: 20,
    letterSpacing: 2,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  modalButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#F2F2F7',
    marginRight: 10,
  },
  cancelButtonText: {
    color: '#6D6D72',
    fontSize: 16,
    fontWeight: '600',
  },
  joinButton: {
    backgroundColor: '#007AFF',
    marginLeft: 10,
  },
  joinButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
