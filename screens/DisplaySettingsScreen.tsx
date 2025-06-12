import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  SafeAreaView,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';

interface SettingRowProps {
  title: string;
  value?: string;
  hasToggle?: boolean;
  toggleValue?: boolean;
  onToggleChange?: (value: boolean) => void;
  hasNavigation?: boolean;
  onPress?: () => void;
}

function SettingRow({
  title,
  value,
  hasToggle,
  toggleValue,
  onToggleChange,
  hasNavigation,
  onPress,
}: SettingRowProps) {
  return (
    <TouchableOpacity
      style={styles.settingRow}
      onPress={onPress}
      disabled={!onPress && !hasToggle}
      activeOpacity={onPress ? 0.7 : 1}
    >
      <Text style={styles.settingTitle}>{title}</Text>
      <View style={styles.settingRight}>
        {value && (
          <>
            <Text style={styles.settingValue}>{value}</Text>
            {hasNavigation && <Text style={styles.chevron}>›</Text>}
          </>
        )}
        {hasToggle && (
          <Switch
            value={toggleValue}
            onValueChange={onToggleChange}
            trackColor={{ false: '#E5E5EA', true: '#34C759' }}
            thumbColor="#FFFFFF"
            ios_backgroundColor="#E5E5EA"
          />
        )}
        {hasNavigation && !value && <Text style={styles.chevron}>›</Text>}
      </View>
    </TouchableOpacity>
  );
}

export function DisplaySettingsScreen() {
  const navigation = useNavigation();
  const [startWeekOn, setStartWeekOn] = useState('Sunday');
  const [themeSelection, setThemeSelection] = useState('Light');
  const [autoDarkTheme, setAutoDarkTheme] = useState(true);
  const [twelveHourFormat, setTwelveHourFormat] = useState(true);
  const [showWeather, setShowWeather] = useState(false);

  const handleStartWeekOnPress = () => {
    setStartWeekOn(startWeekOn === 'Sunday' ? 'Monday' : 'Sunday');
  };

  const handleThemePress = () => {
    setThemeSelection(themeSelection === 'Light' ? 'Dark' : 'Light');
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <TouchableOpacity 
            style={styles.backButton} 
            onPress={() => navigation.navigate('Settings' as never)}
          >
            <Text style={styles.backButtonText}>‹ Settings</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Display</Text>
        </View>

        <View style={styles.sectionContent}>
          <SettingRow
            title="Start Week On"
            value={startWeekOn}
            hasNavigation
            onPress={handleStartWeekOnPress}
          />
          <View style={styles.separator} />
          <SettingRow
            title="Theme Selection"
            value={themeSelection}
            hasNavigation
            onPress={handleThemePress}
          />
          <View style={styles.separator} />
          <SettingRow
            title="Auto Dark Theme"
            hasToggle
            toggleValue={autoDarkTheme}
            onToggleChange={setAutoDarkTheme}
          />
          <View style={styles.separator} />
          <SettingRow
            title="12 Hour Format"
            hasToggle
            toggleValue={twelveHourFormat}
            onToggleChange={setTwelveHourFormat}
          />
          <View style={styles.separator} />
          <SettingRow
            title="Show Weather"
            hasToggle
            toggleValue={showWeather}
            onToggleChange={setShowWeather}
          />
        </View>
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
  header: {
    marginHorizontal: 20,
    marginTop: 10,
    marginBottom: 30,
  },
  backButton: {
    marginBottom: 10,
  },
  backButtonText: {
    fontSize: 17,
    color: '#007AFF',
    fontWeight: '400',
  },
  title: {
    fontSize: 34,
    fontWeight: 'bold',
    color: '#000000',
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
  settingRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  settingValue: {
    fontSize: 17,
    color: '#8E8E93',
    marginRight: 8,
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