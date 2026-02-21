import { useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ListPicker, ReminderForm } from '@/components';
import { ReminderFormState } from '@/components/ReminderForm';
import { RootStackParamList } from '@/navigation/RootNavigator';
import * as actionRepo from '@/repos/actionRepo';
import { refreshListReminders } from '@/services/listReminderService';
import { scheduleActionReminder } from '@/services/reminderService';
import * as sortService from '@/services/sortService';
import { theme } from '@/theme';
import { Action, ActionList, ReminderType } from '@/types';

type AddActionScreenNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  'AddAction'
>;

type AddActionScreenRouteProp = RouteProp<RootStackParamList, 'AddAction'>;

const INITIAL_REMINDER_STATE: ReminderFormState = {
  reminderType: ReminderType.None,
  reminderDate: null,
  reminderTime: null,
  reminderWeekday: null,
  reminderMonthday: null,
};

export default function AddActionScreen() {
  const navigation = useNavigation<AddActionScreenNavigationProp>();
  const route = useRoute<AddActionScreenRouteProp>();

  const [title, setTitle] = useState('');
  const [list, setList] = useState<ActionList | null>(route.params?.list ?? null);
  const [reminder, setReminder] = useState<ReminderFormState>(INITIAL_REMINDER_STATE);
  const [isSaving, setIsSaving] = useState(false);

  const handleReminderChange = (fields: Partial<ReminderFormState>) => {
    setReminder((previous) => ({
      ...previous,
      ...fields,
    }));
  };

  const validateForm = (): boolean => {
    if (title.trim().length === 0) {
      Alert.alert('Title is required');
      return false;
    }

    if (
      reminder.reminderType === ReminderType.Once
      && (
        reminder.reminderDate === null
        || reminder.reminderDate <= Date.now()
      )
    ) {
      Alert.alert('Reminder date must be in the future');
      return false;
    }

    if (
      (
        reminder.reminderType === ReminderType.Daily
        || reminder.reminderType === ReminderType.Weekly
        || reminder.reminderType === ReminderType.Monthly
      )
      && !reminder.reminderTime
    ) {
      Alert.alert('Reminder time is required');
      return false;
    }

    if (
      reminder.reminderType === ReminderType.Weekly
      && reminder.reminderWeekday === null
    ) {
      Alert.alert('Weekday is required');
      return false;
    }

    if (
      reminder.reminderType === ReminderType.Monthly
      && reminder.reminderMonthday === null
    ) {
      Alert.alert('Day of month is required');
      return false;
    }

    return true;
  };

  const handleSave = async () => {
    if (isSaving) {
      return;
    }

    if (!validateForm()) {
      return;
    }

    try {
      setIsSaving(true);

      const now = Date.now();
      const sortIndex = await sortService.computeSortIndexForNewAction(list);

      const actionToInsert: Omit<Action, 'id'> = {
        title: title.trim(),
        list,
        sortIndex,
        isDone: false,
        createdAt: now,
        updatedAt: now,
        reminderType: reminder.reminderType,
        reminderDate: reminder.reminderDate,
        reminderTime: reminder.reminderTime,
        reminderWeekday: reminder.reminderWeekday,
        reminderMonthday: reminder.reminderMonthday,
      };

      const newActionId = await actionRepo.insert(actionToInsert);

      if (actionToInsert.reminderType !== ReminderType.None) {
        await scheduleActionReminder({
          ...actionToInsert,
          id: newActionId,
        });
      }

      try {
        await refreshListReminders();
      } catch {
        // Ignore reminder refresh failures so action creation still succeeds.
      }

      navigation.goBack();
    } catch {
      Alert.alert('Unable to save action');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.content}
      >
        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Title</Text>
          <TextInput
            value={title}
            onChangeText={setTitle}
            autoFocus
            placeholder="What do you need to do?"
            placeholderTextColor={theme.colors.textSecondary}
            style={styles.input}
            selectionColor={theme.colors.primary}
            returnKeyType="done"
          />
        </View>

        <View style={styles.fieldGroup}>
          <Text style={styles.label}>List</Text>
          <ListPicker
            value={list}
            onChange={setList}
          />
        </View>

        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Reminder</Text>
          <ReminderForm
            reminderType={reminder.reminderType}
            reminderDate={reminder.reminderDate}
            reminderTime={reminder.reminderTime}
            reminderWeekday={reminder.reminderWeekday}
            reminderMonthday={reminder.reminderMonthday}
            onChange={handleReminderChange}
          />
        </View>

        <Pressable
          onPress={() => {
            void handleSave();
          }}
          disabled={isSaving}
          style={({ pressed }) => [
            styles.saveButton,
            (pressed || isSaving) && styles.saveButtonPressed,
          ]}
        >
          <Text style={styles.saveButtonText}>
            {isSaving ? 'Saving...' : 'Save'}
          </Text>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  content: {
    padding: 16,
    paddingBottom: 28,
    gap: 20,
  },
  fieldGroup: {
    gap: 8,
  },
  label: {
    color: theme.colors.text,
    fontSize: 15,
    fontWeight: '600',
  },
  input: {
    minHeight: 48,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
    color: theme.colors.text,
    paddingHorizontal: 12,
    fontSize: 16,
  },
  saveButton: {
    minHeight: 48,
    borderRadius: 10,
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  saveButtonPressed: {
    opacity: 0.9,
  },
  saveButtonText: {
    color: theme.colors.text,
    fontSize: 16,
    fontWeight: '700',
  },
});
