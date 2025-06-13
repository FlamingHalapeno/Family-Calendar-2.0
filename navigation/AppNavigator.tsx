import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createDrawerNavigator, DrawerContentComponentProps } from '@react-navigation/drawer';
import { CalendarScreen } from '../screens/CalendarScreen';
import { SettingsScreen } from '../screens/SettingsScreen';
import { DisplaySettingsScreen } from '../screens/DisplaySettingsScreen';
import { NotificationSettingsScreen } from '../screens/NotificationSettingsScreen';
import { AboutSettingsScreen } from '../screens/AboutSettingsScreen';
import { TasksScreen } from '../screens/TasksScreen';
import { NotesScreen } from '../screens/NotesScreen';
import { ContactsScreen } from '../screens/ContactsScreen';
import { LoginScreen } from '../screens/LoginScreen';
import { FamilySettingsScreen } from '../screens/FamilySettingsScreen';
import { FamilyMembersScreen } from '../screens/FamilyMembersScreen';
import { DrawerContent } from '../components/DrawerContent';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { useAuth } from '../hooks/use-auth';

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
      <Drawer.Screen
        name="FamilySettings"
        component={FamilySettingsScreen}
        options={{
          title: 'Family',
          drawerItemStyle: { display: 'none' },
        }}
      />
      <Drawer.Screen
        name="FamilyMembers"
        component={FamilyMembersScreen}
        options={{
          title: 'Family Members',
          drawerItemStyle: { display: 'none' },
        }}
      />
      <Drawer.Screen
        name="DisplaySettings"
        component={DisplaySettingsScreen}
        options={{
          title: 'Display',
          drawerItemStyle: { display: 'none' },
        }}
      />
      <Drawer.Screen 
        name="NotificationSettings" 
        component={NotificationSettingsScreen}
        options={{
          title: 'Notifications',
          drawerItemStyle: { display: 'none' },
        }}
      />
      <Drawer.Screen 
        name="AboutSettings" 
        component={AboutSettingsScreen}
        options={{
          title: 'About',
          drawerItemStyle: { display: 'none' },
        }}
      />
    </Drawer.Navigator>
  );
}

export function AppNavigator() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return <LoadingSpinner fullScreen message="Loading..." />;
  }

  return (
    <NavigationContainer>
      {user ? <AuthenticatedNavigator /> : <LoginScreen />}
    </NavigationContainer>
  );
}

