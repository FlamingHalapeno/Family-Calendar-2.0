import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Modal,
  ScrollView,
  StyleSheet,
  Alert,
  Switch,
  ActivityIndicator,
} from 'react-native';
import { EventFormData, EventModalProps } from '../../types';
import { useAuth } from '../../hooks/use-auth';
import { useUserCalendarOptions } from '../../hooks/useLinkedCalendars';

export function EventModal({ visible, onClose, onSave, initialDate, editingEvent }: EventModalProps) {
  const { user } = useAuth();

  // Initialize with current date and one hour later as valid ISO strings
  const initialFormStartDate = new Date().toISOString();
  const initialFormEndDate = new Date(Date.now() + 60 * 60 * 1000).toISOString(); // 1 hour later

  const [formData, setFormData] = useState<EventFormData>({
    title: '',
    description: '',
    start_date: initialFormStartDate,
    end_date: initialFormEndDate,
    user_id: user?.id,
    family_id: undefined,
    color: '#007AFF',
    linked_calendar_id: null, // Default to Family Calendar
  });
  
  const [isAllDay, setIsAllDay] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Get user's calendar options
  const { data: calendarOptions, isLoading: calendarOptionsLoading } = useUserCalendarOptions();

  useEffect(() => {
    if (visible) {
      if (editingEvent) {
        // Editing existing event
        setFormData({
          title: editingEvent.title,
          description: editingEvent.description || '',
          start_date: editingEvent.start_date,
          end_date: editingEvent.end_date,
          user_id: editingEvent.user_id,
          family_id: editingEvent.family_id,
          color: editingEvent.color || '#007AFF',
          linked_calendar_id: editingEvent.linked_calendar_id || null,
        });
        
        const start = new Date(editingEvent.start_date);
        const end = new Date(editingEvent.end_date);
        setIsAllDay(start.getHours() === 0 && start.getMinutes() === 0 && 
                   end.getHours() === 23 && end.getMinutes() === 59);
      } else {
        // Creating new event - set defaults from Family Calendar
        const defaultCalendar = calendarOptions?.find(cal => cal.isDefault);
        const startDate = initialDate || new Date();
        const endDate = new Date(startDate);
        endDate.setHours(startDate.getHours() + 1);
        
        setFormData(prev => ({
          ...prev,
          title: '',
          description: '',
          start_date: startDate.toISOString(),
          end_date: endDate.toISOString(),
          user_id: prev.user_id || user?.id,
          color: defaultCalendar?.color || '#007AFF',
          linked_calendar_id: null, // Default to Family Calendar
        }));
        setIsAllDay(false);
      }
    }
  }, [visible, editingEvent, initialDate, user?.id, calendarOptions]);

  const formatDateTimeInput = (dateString: string) => {
    const date = new Date(dateString);
    return date.toISOString().slice(0, 16); // YYYY-MM-DDTHH:mm format
  };

  const handleDateTimeChange = (field: 'start_date' | 'end_date', value: string) => {
    const date = new Date(value);
    setFormData(prev => ({
      ...prev,
      [field]: date.toISOString()
    }));
  };

  const handleAllDayToggle = (value: boolean) => {
    setIsAllDay(value);
    
    if (value) {
      // Set to all day (00:00 to 23:59)
      const startDate = new Date(formData.start_date);
      const endDate = new Date(formData.end_date);
      
      startDate.setHours(0, 0, 0, 0);
      endDate.setHours(23, 59, 59, 999);
      
      setFormData(prev => ({
        ...prev,
        start_date: startDate.toISOString(),
        end_date: endDate.toISOString()
      }));
    }
  };

  const handleCalendarSelect = (calendarId: string | null) => {
    const selectedCalendar = calendarOptions?.find(cal => cal.id === calendarId);
    if (selectedCalendar) {
      setFormData(prev => ({
        ...prev,
        linked_calendar_id: calendarId,
        color: selectedCalendar.color
      }));
    }
  };

  const handleSave = async () => {
    if (!formData.title.trim()) {
      Alert.alert('Error', 'Please enter a title for the event');
      return;
    }

    if (new Date(formData.start_date) >= new Date(formData.end_date)) {
      Alert.alert('Error', 'End time must be after start time');
      return;
    }

    setIsLoading(true);
    try {
      await onSave(formData);
      onClose();
    } catch (error) {
      Alert.alert('Error', 'Failed to save event. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const selectedCalendar = calendarOptions?.find(cal => cal.id === formData.linked_calendar_id);

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.cancelButton}>
            <Text style={styles.cancelText}>Cancel</Text>
          </TouchableOpacity>
          
          <Text style={styles.title}>
            {editingEvent ? 'Edit Event' : 'New Event'}
          </Text>
          
          <TouchableOpacity 
            onPress={handleSave} 
            style={[styles.saveButton, isLoading && styles.disabledButton]}
            disabled={isLoading}
          >
            <Text style={styles.saveText}>
              {isLoading ? 'Saving...' : 'Save'}
            </Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.form} showsVerticalScrollIndicator={false}>
          {/* Title */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Title *</Text>
            <TextInput
              style={styles.textInput}
              value={formData.title}
              onChangeText={(text) => setFormData(prev => ({ ...prev, title: text }))}
              placeholder="Event title"
              maxLength={100}
            />
          </View>

          {/* Description */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Description</Text>
            <TextInput
              style={[styles.textInput, styles.textArea]}
              value={formData.description}
              onChangeText={(text) => setFormData(prev => ({ ...prev, description: text }))}
              placeholder="Event description (optional)"
              multiline
              numberOfLines={3}
              maxLength={500}
            />
          </View>

          {/* All Day Toggle */}
          <View style={styles.inputGroup}>
            <View style={styles.switchRow}>
              <Text style={styles.label}>All Day</Text>
              <Switch
                value={isAllDay}
                onValueChange={handleAllDayToggle}
                trackColor={{ false: '#767577', true: '#007AFF' }}
                thumbColor="#fff"
              />
            </View>
          </View>

          {/* Start Date/Time */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Start {isAllDay ? 'Date' : 'Date & Time'}</Text>
            <TextInput
              style={styles.textInput}
              value={formatDateTimeInput(formData.start_date)}
              onChangeText={(value) => handleDateTimeChange('start_date', value)}
              placeholder={isAllDay ? 'YYYY-MM-DD' : 'YYYY-MM-DDTHH:MM'}
            />
          </View>

          {/* End Date/Time */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>End {isAllDay ? 'Date' : 'Date & Time'}</Text>
            <TextInput
              style={styles.textInput}
              value={formatDateTimeInput(formData.end_date)}
              onChangeText={(value) => handleDateTimeChange('end_date', value)}
              placeholder={isAllDay ? 'YYYY-MM-DD' : 'YYYY-MM-DDTHH:MM'}
            />
          </View>

          {/* Calendar Selection */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Calendar</Text>
            {calendarOptionsLoading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator color="#007AFF" />
                <Text style={styles.loadingText}>Loading calendars...</Text>
              </View>
            ) : (
              <View style={styles.calendarGrid}>
                {calendarOptions?.map((calendar) => (
                  <TouchableOpacity
                    key={calendar.id || 'default'}
                    style={[
                      styles.calendarOption,
                      formData.linked_calendar_id === calendar.id && styles.selectedCalendar
                    ]}
                    onPress={() => handleCalendarSelect(calendar.id)}
                  >
                    <View style={[styles.calendarDot, { backgroundColor: calendar.color }]} />
                    <Text style={[
                      styles.calendarName,
                      formData.linked_calendar_id === calendar.id && styles.selectedCalendarText
                    ]}>
                      {calendar.name}
                    </Text>
                    {calendar.isDefault && (
                      <Text style={styles.defaultBadge}>Default</Text>
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>

          {/* Selected Calendar Preview */}
          {selectedCalendar && (
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Selected Calendar</Text>
              <View style={styles.selectedCalendarPreview}>
                <View style={[styles.calendarDot, { backgroundColor: selectedCalendar.color }]} />
                <Text style={styles.selectedCalendarName}>{selectedCalendar.name}</Text>
              </View>
            </View>
          )}
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  cancelButton: {
    padding: 8,
  },
  cancelText: {
    fontSize: 16,
    color: '#007AFF',
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  saveButton: {
    padding: 8,
  },
  saveText: {
    fontSize: 16,
    color: '#007AFF',
    fontWeight: '600',
  },
  disabledButton: {
    opacity: 0.5,
  },
  form: {
    flex: 1,
    padding: 16,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    marginBottom: 8,
  },
  textInput: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    color: '#333',
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  loadingText: {
    fontSize: 16,
    color: '#007AFF',
    marginLeft: 10,
  },
  calendarGrid: {
    gap: 8,
  },
  calendarOption: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    padding: 12,
  },
  selectedCalendar: {
    borderColor: '#007AFF',
    backgroundColor: '#f0f7ff',
  },
  calendarDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    marginRight: 12,
  },
  calendarName: {
    fontSize: 16,
    color: '#333',
    flex: 1,
  },
  selectedCalendarText: {
    color: '#007AFF',
    fontWeight: '500',
  },
  defaultBadge: {
    fontSize: 12,
    color: '#007AFF',
    backgroundColor: '#e3f2fd',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  selectedCalendarPreview: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  selectedCalendarName: {
    fontSize: 16,
    color: '#333',
    marginLeft: 12,
  },
}); 