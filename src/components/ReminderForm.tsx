import DateTimePicker, {
  DateTimePickerEvent,
} from '@react-native-community/datetimepicker';
import { useMemo, useState } from 'react';
import {
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { theme } from '@/theme';
import { ReminderType } from '@/types';
import TimePicker from '@/components/TimePicker';

export type ReminderFormState = {
  reminderType: ReminderType;
  reminderDate: number | null;
  reminderTime: string | null;
  reminderWeekday: number | null;
  reminderMonthday: number | null;
};

type ReminderFormProps = ReminderFormState & {
  onChange: (fields: Partial<ReminderFormState>) => void;
};

type ReminderTypeOption = {
  label: string;
  value: ReminderType;
};

type WeekdayOption = {
  label: string;
  value: number;
};

const REMINDER_OPTIONS: ReminderTypeOption[] = [
  { label: 'None', value: ReminderType.None },
  { label: 'Once', value: ReminderType.Once },
  { label: 'Daily', value: ReminderType.Daily },
  { label: 'Weekly', value: ReminderType.Weekly },
  { label: 'Monthly', value: ReminderType.Monthly },
];

const WEEKDAY_OPTIONS: WeekdayOption[] = [
  { label: 'Mon', value: 1 },
  { label: 'Tue', value: 2 },
  { label: 'Wed', value: 3 },
  { label: 'Thu', value: 4 },
  { label: 'Fri', value: 5 },
  { label: 'Sat', value: 6 },
  { label: 'Sun', value: 7 },
];

function formatDate(date: Date): string {
  const day = `${date.getDate()}`.padStart(2, '0');
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
}

function formatTime(date: Date): string {
  const hours = `${date.getHours()}`.padStart(2, '0');
  const minutes = `${date.getMinutes()}`.padStart(2, '0');
  return `${hours}:${minutes}`;
}

function parseTime(value: string): {
  hours: number;
  minutes: number;
} {
  const [hoursRaw, minutesRaw] = value.split(':');
  const parsedHours = Number.parseInt(hoursRaw ?? '0', 10);
  const parsedMinutes = Number.parseInt(minutesRaw ?? '0', 10);

  return {
    hours: Number.isFinite(parsedHours) ? parsedHours : 0,
    minutes: Number.isFinite(parsedMinutes) ? parsedMinutes : 0,
  };
}

function clampMonthday(value: number): number {
  return Math.max(1, Math.min(31, value));
}

function getInitialOnceDate(reminderDate: number | null): Date {
  return reminderDate ? new Date(reminderDate) : new Date();
}

export default function ReminderForm({
  reminderType,
  reminderDate,
  reminderTime,
  reminderWeekday,
  reminderMonthday,
  onChange,
}: ReminderFormProps) {
  const [showDatePicker, setShowDatePicker] = useState(false);
  const onceDate = useMemo(
    () => getInitialOnceDate(reminderDate),
    [reminderDate],
  );

  const handleReminderTypeChange = (nextType: ReminderType) => {
    if (nextType === ReminderType.None) {
      onChange({
        reminderType: nextType,
        reminderDate: null,
        reminderTime: null,
        reminderWeekday: null,
        reminderMonthday: null,
      });
      return;
    }

    if (nextType === ReminderType.Once) {
      onChange({
        reminderType: nextType,
        reminderDate: reminderDate ?? Date.now(),
        reminderTime: null,
        reminderWeekday: null,
        reminderMonthday: null,
      });
      return;
    }

    if (nextType === ReminderType.Daily) {
      onChange({
        reminderType: nextType,
        reminderDate: null,
        reminderTime: reminderTime ?? '08:00',
        reminderWeekday: null,
        reminderMonthday: null,
      });
      return;
    }

    if (nextType === ReminderType.Weekly) {
      onChange({
        reminderType: nextType,
        reminderDate: null,
        reminderTime: reminderTime ?? '08:00',
        reminderWeekday: reminderWeekday ?? 1,
        reminderMonthday: null,
      });
      return;
    }

    onChange({
      reminderType: nextType,
      reminderDate: null,
      reminderTime: reminderTime ?? '08:00',
      reminderWeekday: null,
      reminderMonthday: clampMonthday(reminderMonthday ?? 1),
    });
  };

  const handleOnceDateChange = (event: DateTimePickerEvent, selectedDate?: Date) => {
    if (event.type === 'dismissed') {
      setShowDatePicker(false);
      return;
    }

    if (selectedDate) {
      const next = new Date(selectedDate);
      next.setHours(
        onceDate.getHours(),
        onceDate.getMinutes(),
        0,
        0,
      );
      onChange({ reminderDate: next.getTime() });
    }

    if (Platform.OS !== 'ios') {
      setShowDatePicker(false);
    }
  };

  const handleOnceTimeChange = (value: string) => {
    const { hours, minutes } = parseTime(value);
    const next = new Date(onceDate);
    next.setHours(hours, minutes, 0, 0);
    onChange({ reminderDate: next.getTime() });
  };

  const handleMonthdayChange = (value: string) => {
    const sanitized = value.replace(/[^0-9]/g, '');
    if (sanitized.length === 0) {
      onChange({ reminderMonthday: null });
      return;
    }

    const parsed = Number.parseInt(sanitized, 10);
    if (!Number.isFinite(parsed)) {
      return;
    }

    onChange({ reminderMonthday: clampMonthday(parsed) });
  };

  const displayedTimeForOnce = formatTime(onceDate);
  const displayedTime = reminderTime ?? '08:00';

  return (
    <View style={styles.container}>
      <View style={styles.segmentedRow}>
        {REMINDER_OPTIONS.map((option) => {
          const isSelected = reminderType === option.value;

          return (
            <Pressable
              key={option.value}
              onPress={() => handleReminderTypeChange(option.value)}
              style={({ pressed }) => [
                styles.segment,
                isSelected && styles.segmentSelected,
                pressed && styles.segmentPressed,
              ]}
            >
              <Text
                style={[
                  styles.segmentText,
                  isSelected && styles.segmentTextSelected,
                ]}
              >
                {option.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {reminderType === ReminderType.Once && (
        <View style={styles.section}>
          <Text style={styles.label}>Date</Text>
          <Pressable
            onPress={() => setShowDatePicker(true)}
            style={({ pressed }) => [
              styles.inputButton,
              pressed && styles.segmentPressed,
            ]}
          >
            <Text style={styles.inputButtonText}>{formatDate(onceDate)}</Text>
          </Pressable>

          {showDatePicker && (
            <DateTimePicker
              value={onceDate}
              mode="date"
              minimumDate={new Date()}
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              themeVariant="dark"
              onChange={handleOnceDateChange}
            />
          )}

          {showDatePicker && Platform.OS === 'ios' && (
            <Pressable
              onPress={() => setShowDatePicker(false)}
              style={({ pressed }) => [
                styles.inlineCloseButton,
                pressed && styles.segmentPressed,
              ]}
            >
              <Text style={styles.inlineCloseButtonText}>Done</Text>
            </Pressable>
          )}

          <Text style={styles.label}>Time</Text>
          <TimePicker
            value={displayedTimeForOnce}
            onChange={handleOnceTimeChange}
          />
        </View>
      )}

      {reminderType === ReminderType.Daily && (
        <View style={styles.section}>
          <Text style={styles.label}>Time</Text>
          <TimePicker
            value={displayedTime}
            onChange={(value) => onChange({ reminderTime: value })}
          />
        </View>
      )}

      {reminderType === ReminderType.Weekly && (
        <View style={styles.section}>
          <Text style={styles.label}>Weekday</Text>
          <View style={styles.weekdayRow}>
            {WEEKDAY_OPTIONS.map((option) => {
              const isSelected = (reminderWeekday ?? 1) === option.value;

              return (
                <Pressable
                  key={option.value}
                  onPress={() => onChange({ reminderWeekday: option.value })}
                  style={({ pressed }) => [
                    styles.weekdayChip,
                    isSelected && styles.weekdayChipSelected,
                    pressed && styles.segmentPressed,
                  ]}
                >
                  <Text
                    style={[
                      styles.weekdayText,
                      isSelected && styles.weekdayTextSelected,
                    ]}
                  >
                    {option.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <Text style={styles.label}>Time</Text>
          <TimePicker
            value={displayedTime}
            onChange={(value) => onChange({ reminderTime: value })}
          />
        </View>
      )}

      {reminderType === ReminderType.Monthly && (
        <View style={styles.section}>
          <Text style={styles.label}>Day of Month</Text>
          <TextInput
            value={reminderMonthday === null ? '' : `${reminderMonthday}`}
            onChangeText={handleMonthdayChange}
            keyboardType="number-pad"
            maxLength={2}
            placeholder="1-31"
            placeholderTextColor={theme.colors.textSecondary}
            style={styles.input}
          />

          <Text style={styles.label}>Time</Text>
          <TimePicker
            value={displayedTime}
            onChange={(value) => onChange({ reminderTime: value })}
          />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 12,
  },
  segmentedRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    backgroundColor: theme.colors.surface,
    borderRadius: 10,
    padding: 4,
  },
  segment: {
    paddingHorizontal: 10,
    minHeight: 48,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.surface,
  },
  segmentSelected: {
    backgroundColor: theme.colors.surfaceAlt,
  },
  segmentPressed: {
    opacity: 0.9,
  },
  segmentText: {
    color: theme.colors.textSecondary,
    fontSize: 13,
    fontWeight: '500',
  },
  segmentTextSelected: {
    color: theme.colors.text,
  },
  section: {
    gap: 10,
  },
  label: {
    color: theme.colors.text,
    fontSize: 14,
    fontWeight: '500',
  },
  inputButton: {
    minHeight: 48,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  inputButtonText: {
    color: theme.colors.text,
    fontSize: 15,
  },
  inlineCloseButton: {
    alignSelf: 'flex-end',
    minHeight: 48,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: theme.colors.surfaceAlt,
    justifyContent: 'center',
  },
  inlineCloseButtonText: {
    color: theme.colors.text,
    fontSize: 13,
    fontWeight: '600',
  },
  weekdayRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  weekdayChip: {
    minHeight: 48,
    paddingHorizontal: 12,
    borderRadius: 18,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  weekdayChipSelected: {
    backgroundColor: theme.colors.surfaceAlt,
  },
  weekdayText: {
    color: theme.colors.textSecondary,
    fontSize: 13,
    fontWeight: '500',
  },
  weekdayTextSelected: {
    color: theme.colors.text,
  },
  input: {
    minHeight: 48,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
    color: theme.colors.text,
    paddingHorizontal: 12,
    fontSize: 15,
  },
});
