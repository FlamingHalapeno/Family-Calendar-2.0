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
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useCreateFamily } from '../hooks/useFamily';

export function FamilySettingsScreen() {
  const navigation = useNavigation();
  const [familyName, setFamilyName] = useState('');
  const createFamilyMutation = useCreateFamily();

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
          <Text style={styles.infoText}>Functionality to join a family with an invite code is coming soon.</Text>
          <TouchableOpacity style={[styles.button, styles.disabledButton]} disabled>
            <Text style={styles.buttonText}>Join Family</Text>
          </TouchableOpacity>
        </View>
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
});
