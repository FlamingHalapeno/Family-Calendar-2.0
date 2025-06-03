import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createDrawerNavigator, DrawerContentComponentProps } from '@react-navigation/drawer';
import { CalendarScreen } from '../screens/CalendarScreen';
import { SettingsScreen } from '../screens/SettingsScreen';
import { TasksScreen } from '../screens/TasksScreen';
import { NotesScreen } from '../screens/NotesScreen';
import { ContactsScreen } from '../screens/ContactsScreen';
import { DrawerContent } from '../components/DrawerContent';

const Drawer = createDrawerNavigator();

export function AppNavigator() {
  return (
    <NavigationContainer>
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
    </NavigationContainer>
  );
} 