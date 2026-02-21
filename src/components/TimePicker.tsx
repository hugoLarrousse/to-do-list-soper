import DateTimePicker, {
  DateTimePickerEvent,
} from '@react-native-community/datetimepicker';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { useMemo, useState } from 'react';
import { theme } from '@/theme';

type TimePickerProps = {
  value: string;
  onChange: (value: string) => void;
};

function formatTime(date: Date): string {
  const hours = `${date.getHours()}`.padStart(2, '0');
  const minutes = `${date.getMinutes()}`.padStart(2, '0');
  return `${hours}:${minutes}`;
}

function parseTime(value: string): Date {
  const [hoursRaw, minutesRaw] = value.split(':');
  const hours = Number.isFinite(Number(hoursRaw)) ? Number(hoursRaw) : 0;
  const minutes = Number.isFinite(Number(minutesRaw)) ? Number(minutesRaw) : 0;

  const date = new Date();
  date.setHours(hours, minutes, 0, 0);
  return date;
}

export default function TimePicker({ value, onChange }: TimePickerProps) {
  const [showPicker, setShowPicker] = useState(false);
  const pickerValue = useMemo(() => parseTime(value), [value]);

  const handlePickerChange = (event: DateTimePickerEvent, selectedDate?: Date) => {
    if (event.type === 'dismissed') {
      setShowPicker(false);
      return;
    }

    if (selectedDate) {
      onChange(formatTime(selectedDate));
    }

    if (Platform.OS !== 'ios') {
      setShowPicker(false);
    }
  };

  return (
    <View style={styles.container}>
      <Pressable
        onPress={() => setShowPicker(true)}
        style={({ pressed }) => [
          styles.trigger,
          pressed && styles.triggerPressed,
        ]}
      >
        <Text style={styles.triggerText}>{value}</Text>
      </Pressable>

      {showPicker && (
        <DateTimePicker
          value={pickerValue}
          mode="time"
          is24Hour
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          themeVariant="dark"
          onChange={handlePickerChange}
        />
      )}

      {showPicker && Platform.OS === 'ios' && (
        <Pressable
          onPress={() => setShowPicker(false)}
          style={({ pressed }) => [
            styles.closeButton,
            pressed && styles.triggerPressed,
          ]}
        >
          <Text style={styles.closeButtonText}>Done</Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 8,
  },
  trigger: {
    minHeight: 48,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  triggerPressed: {
    opacity: 0.9,
  },
  triggerText: {
    color: theme.colors.text,
    fontSize: 15,
    fontWeight: '500',
  },
  closeButton: {
    alignSelf: 'flex-end',
    minHeight: 48,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: theme.colors.surfaceAlt,
    justifyContent: 'center',
  },
  closeButtonText: {
    color: theme.colors.text,
    fontSize: 13,
    fontWeight: '600',
  },
});
