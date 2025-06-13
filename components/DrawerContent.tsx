import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  Alert,
} from 'react-native';
import { DrawerContentScrollView, DrawerContentComponentProps } from '@react-navigation/drawer';
import { useAuth } from '../hooks/use-auth';

interface DrawerItemProps {
  label: string;
  icon: string;
  onPress: () => void;
  isActive: boolean;
}

function DrawerItem({ label, icon, onPress, isActive }: DrawerItemProps) {
  return (
    <TouchableOpacity
      style={[styles.drawerItem, isActive && styles.activeItem]}
      onPress={onPress}
    >
      <Text style={styles.icon}>{icon}</Text>
      <Text style={[styles.label, isActive && styles.activeLabel]}>{label}</Text>
    </TouchableOpacity>
  );
}

export function DrawerContent(props: DrawerContentComponentProps) {
  const { navigation, state } = props;
  const currentRoute = state.routes[state.index].name;
  const { signOut, user } = useAuth();

  const handleLogout = async () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            const { error } = await signOut();
            if (error) {
              Alert.alert('Error', 'Failed to sign out');
            }
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <DrawerContentScrollView {...props} contentContainerStyle={styles.scrollContainer}>
        <View style={styles.header}>
          <Text style={styles.title}>Family Calendar</Text>
          <Text style={styles.subtitle}>v2.0</Text>
          {user?.email && (
            <Text style={styles.userEmail}>{user.email}</Text>
          )}
        </View>
        
        <View style={styles.menuItems}>
          <DrawerItem
            label="Calendar"
            icon="📅"
            isActive={currentRoute === 'Calendar'}
            onPress={() => navigation.navigate('Calendar')}
          />
          
          <DrawerItem
            label="Tasks"
            icon="✅"
            isActive={currentRoute === 'Tasks'}
            onPress={() => navigation.navigate('Tasks')}
          />
          
          <DrawerItem
            label="Notes"
            icon="📝"
            isActive={currentRoute === 'Notes'}
            onPress={() => navigation.navigate('Notes')}
          />
          
          <DrawerItem
            label="Contacts"
            icon="👥"
            isActive={currentRoute === 'Contacts'}
            onPress={() => navigation.navigate('Contacts')}
          />
          
          <View style={styles.divider} />
          
          <DrawerItem
            label="Settings"
            icon="⚙️"
            isActive={currentRoute === 'Settings'}
            onPress={() => navigation.navigate('Settings')}
          />
        </View>
      </DrawerContentScrollView>
      
      <View style={styles.footer}>
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Text style={styles.logoutIcon}>🚪</Text>
          <Text style={styles.logoutText}>Sign Out</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  scrollContainer: {
    flex: 1,
  },
  header: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
  },
  userEmail: {
    fontSize: 12,
    color: '#888',
    marginTop: 4,
  },
  menuItems: {
    paddingVertical: 20,
  },
  drawerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    marginHorizontal: 10,
    borderRadius: 8,
  },
  activeItem: {
    backgroundColor: '#007AFF',
  },
  icon: {
    fontSize: 20,
    marginRight: 15,
    width: 24,
    textAlign: 'center',
  },
  label: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
  },
  activeLabel: {
    color: '#fff',
    fontWeight: '600',
  },
  divider: {
    height: 1,
    backgroundColor: '#e9ecef',
    marginVertical: 10,
    marginHorizontal: 20,
  },
  footer: {
    borderTopWidth: 1,
    borderTopColor: '#e9ecef',
    backgroundColor: '#fff',
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    marginHorizontal: 10,
    marginVertical: 10,
    borderRadius: 8,
  },
  logoutIcon: {
    fontSize: 20,
    marginRight: 15,
    width: 24,
    textAlign: 'center',
  },
  logoutText: {
    fontSize: 16,
    color: '#dc3545',
    fontWeight: '500',
  },
}); 