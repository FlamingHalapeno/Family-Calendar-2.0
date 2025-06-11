import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createDrawerNavigator, DrawerContentComponentProps } from '@react-navigation/drawer';
import { ActivityIndicator, View, StyleSheet } from 'react-native';
import { CalendarScreen } from '../screens/CalendarScreen';
import { SettingsScreen } from '../screens/SettingsScreen';
import { TasksScreen } from '../screens/TasksScreen';
import { NotesScreen } from '../screens/NotesScreen';
import { ContactsScreen } from '../screens/ContactsScreen';
import { LoginScreen } from '../screens/LoginScreen';
import { DrawerContent } from '../components/DrawerContent';
import { useAuth } from '../providers/AuthProvider';

const Drawer = createDrawerNavigator();

function AuthenticatedNavigator() {
  return (
    <Drawer.Navigator
      drawerContent={(props: DrawerContentComponentProps) => <DrawerContent {...props} />}
      screenOptions={{
        headerShown: true,
        drawerType: 'permanent',
        overlayColor: 'rgba(0,0,0,0.3)',
        drawerStyle: {
          width: 280,
        },
        headerStyle: {
          backgroundColor: '#007AFF',
        },
        headerTintColor: '#fff',
        headerTitleStyle: {
          fontWeight: 'bold',
        },
      }}
      initialRouteName="Calendar"
    >
      <Drawer.Screen 
        name="Calendar" 
        component={CalendarScreen}
        options={{
          title: 'Family Calendar',
          headerShown: false,
        }}
      />
      <Drawer.Screen 
        name="Tasks" 
        component={TasksScreen}
        options={{
          title: 'Tasks & To-Do',
        }}
      />
      <Drawer.Screen 
        name="Notes" 
        component={NotesScreen}
        options={{
          title: 'Notes',
        }}
      />
      <Drawer.Screen 
        name="Contacts" 
        component={ContactsScreen}
        options={{
          title: 'Family Contacts',
        }}
      />
      <Drawer.Screen 
        name="Settings" 
        component={SettingsScreen}
        options={{
          title: 'Settings',
        }}
      />
    </Drawer.Navigator>
  );
}

export function AppNavigator() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  return (
    <NavigationContainer>
      {user ? <AuthenticatedNavigator /> : <LoginScreen />}
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
}); 