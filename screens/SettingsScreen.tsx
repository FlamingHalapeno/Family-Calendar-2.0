import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useFamilyMembers } from '../hooks/useFamily';

interface SettingRowProps {
  title: string;
  onPress?: () => void;
}

function SettingRow({ title, onPress }: SettingRowProps) {
  return (
    <TouchableOpacity
      style={styles.settingRow}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <Text style={styles.settingTitle}>{title}</Text>
      <Text style={styles.chevron}>›</Text>
    </TouchableOpacity>
  );
}

interface SettingSectionProps {
  title: string;
  children: React.ReactNode;
}

function SettingSection({ title, children }: SettingSectionProps) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.sectionContent}>{children}</View>
    </View>
  );
}

export function SettingsScreen() {
  const navigation = useNavigation();
  const { data: familyMembers } = useFamilyMembers();

  const handleDisplayPress = () => {
    navigation.navigate('DisplaySettings' as never);
  };

  const handleNotificationsPress = () => {
    navigation.navigate('NotificationSettings' as never);
  };

  const handleFamilyPress = () => {
    // Check if user is already in a family
    const isInFamily = familyMembers && familyMembers.length > 0;

    if (isInFamily) {
      // User is in a family, go to Family Members screen
      navigation.navigate('FamilyMembers' as never);
    } else {
      // User is not in a family, go to Family Settings (create/join)
      navigation.navigate('FamilySettings' as never);
    }
  };

  const handleAboutPress = () => {
    navigation.navigate('AboutSettings' as never);
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>Settings</Text>

        <SettingSection title="General">
          <SettingRow title="Display" onPress={handleDisplayPress} />
          <View style={styles.separator} />
          <SettingRow title="Notifications" onPress={handleNotificationsPress} />
        </SettingSection>

        <SettingSection title="Family">
          <SettingRow title="Family Members" onPress={handleFamilyPress} />
        </SettingSection>

        <SettingSection title="About">
          <SettingRow title="About" onPress={handleAboutPress} />
        </SettingSection>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2F2F7',
  },
  scrollView: {
    flex: 1,
  },
  title: {
    fontSize: 34,
    fontWeight: 'bold',
    color: '#000000',
    marginHorizontal: 20,
    marginTop: 10,
    marginBottom: 30,
  },
  section: {
    marginBottom: 35,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '400',
    color: '#6D6D72',
    textTransform: 'uppercase',
    marginHorizontal: 20,
    marginBottom: 8,
    letterSpacing: -0.08,
  },
  sectionContent: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 20,
    borderRadius: 10,
    overflow: 'hidden',
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    minHeight: 44,
  },
  settingTitle: {
    fontSize: 17,
    color: '#000000',
    fontWeight: '400',
  },
  chevron: {
    fontSize: 18,
    color: '#C7C7CC',
    fontWeight: '600',
  },
  separator: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: '#C6C6C8',
    marginLeft: 16,
  },
}); 