import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
} from 'react-native';
import { DrawerContentScrollView, DrawerContentComponentProps } from '@react-navigation/drawer';

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

  return (
    <SafeAreaView style={styles.container}>
      <DrawerContentScrollView {...props} contentContainerStyle={styles.scrollContainer}>
        <View style={styles.header}>
          <Text style={styles.title}>Family Calendar</Text>
          <Text style={styles.subtitle}>v2.0</Text>
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
}); 