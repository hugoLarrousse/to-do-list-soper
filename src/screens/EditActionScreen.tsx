import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
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
import { rescheduleActionReminder } from '@/services/reminderService';
import * as sortService from '@/services/sortService';
import { theme } from '@/theme';
import { Action, ActionList, ReminderType } from '@/types';

type EditActionScreenNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  'EditAction'
>;

type EditActionScreenRouteProp = RouteProp<RootStackParamList, 'EditAction'>;

const INITIAL_REMINDER_STATE: ReminderFormState = {
  reminderType: ReminderType.None,
  reminderDate: null,
  reminderTime: null,
  reminderWeekday: null,
  reminderMonthday: null,
};

function hasReminderChanged(previous: Action, next: Action): boolean {
  return (
    previous.reminderType !== next.reminderType
    || previous.reminderDate !== next.reminderDate
    || previous.reminderTime !== next.reminderTime
    || previous.reminderWeekday !== next.reminderWeekday
    || previous.reminderMonthday !== next.reminderMonthday
  );
}

export default function EditActionScreen() {
  const navigation = useNavigation<EditActionScreenNavigationProp>();
  const route = useRoute<EditActionScreenRouteProp>();

  const [existingAction, setExistingAction] = useState<Action | null>(null);
  const [title, setTitle] = useState('');
  const [list, setList] = useState<ActionList | null>(null);
  const [reminder, setReminder] = useState<ReminderFormState>(INITIAL_REMINDER_STATE);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const loadAction = async () => {
      try {
        const action = await actionRepo.getById(route.params.actionId);
        if (!isMounted) {
          return;
        }

        if (!action) {
          Alert.alert('Action not found');
          navigation.goBack();
          return;
        }

        setExistingAction(action);
        setTitle(action.title);
        setList(action.list);
        setReminder({
          reminderType: action.reminderType,
          reminderDate: action.reminderDate,
          reminderTime: action.reminderTime,
          reminderWeekday: action.reminderWeekday,
          reminderMonthday: action.reminderMonthday,
        });
      } catch {
        if (isMounted) {
          Alert.alert('Unable to load action');
          navigation.goBack();
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    void loadAction();

    return () => {
      isMounted = false;
    };
  }, [navigation, route.params.actionId]);

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
    if (isSaving || isLoading || !existingAction) {
      return;
    }

    if (!validateForm()) {
      return;
    }

    try {
      setIsSaving(true);

      const listChanged = existingAction.list !== list;
      const nextSortIndex = listChanged
        ? await sortService.computeSortIndexForNewAction(list)
        : existingAction.sortIndex;

      const updatedAction: Action = {
        ...existingAction,
        title: title.trim(),
        list,
        sortIndex: nextSortIndex,
        reminderType: reminder.reminderType,
        reminderDate: reminder.reminderDate,
        reminderTime: reminder.reminderTime,
        reminderWeekday: reminder.reminderWeekday,
        reminderMonthday: reminder.reminderMonthday,
      };

      await actionRepo.update(updatedAction);

      if (hasReminderChanged(existingAction, updatedAction)) {
        await rescheduleActionReminder(updatedAction);
      }

      if (listChanged) {
        try {
          await refreshListReminders();
        } catch {
          // Ignore reminder refresh failures so action update still succeeds.
        }
      }

      navigation.goBack();
    } catch {
      Alert.alert('Unable to update action');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator
          color={theme.colors.primary}
          size="large"
        />
      </View>
    );
  }

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
  loadingContainer: {
    flex: 1,
    backgroundColor: theme.colors.background,
    alignItems: 'center',
    justifyContent: 'center',
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
