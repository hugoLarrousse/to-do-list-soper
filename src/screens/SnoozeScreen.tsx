import { useState } from 'react';
import {
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import DateTimePicker, {
  DateTimePickerEvent,
} from '@react-native-community/datetimepicker';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '@/navigation/RootNavigator';
import {
  SNOOZE_DURATIONS,
  snoozeNotification,
  snoozeNotificationToDate,
} from '@/services/snoozeService';
import { theme } from '@/theme';

type SnoozeScreenNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  'Snooze'
>;

type SnoozeScreenRouteProp = RouteProp<RootStackParamList, 'Snooze'>;

type QuickOption = {
  label: string;
  durationMs: number;
};

const QUICK_OPTIONS: QuickOption[] = [
  { label: '10 minutes', durationMs: SNOOZE_DURATIONS['10min'] },
  { label: '1 hour', durationMs: SNOOZE_DURATIONS['1h'] },
  { label: '1 day', durationMs: SNOOZE_DURATIONS['1d'] },
  { label: '1 week', durationMs: SNOOZE_DURATIONS['1w'] },
];

function formatDateTime(date: Date): string {
  const day = `${date.getDate()}`.padStart(2, '0');
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const year = date.getFullYear();
  const hours = `${date.getHours()}`.padStart(2, '0');
  const minutes = `${date.getMinutes()}`.padStart(2, '0');
  return `${day}/${month}/${year} at ${hours}:${minutes}`;
}

export default function SnoozeScreen() {
  const navigation = useNavigation<SnoozeScreenNavigationProp>();
  const route = useRoute<SnoozeScreenRouteProp>();
  const { title, body, data } = route.params;

  const [isSaving, setIsSaving] = useState(false);
  const [customDate, setCustomDate] = useState<Date>(() => {
    const d = new Date();
    d.setHours(d.getHours() + 1, 0, 0, 0);
    return d;
  });
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);

  const handleQuickSnooze = async (durationMs: number) => {
    if (isSaving) {
      return;
    }

    try {
      setIsSaving(true);
      await snoozeNotification(title, body, data, durationMs);
      navigation.goBack();
    } catch {
      Alert.alert('Unable to snooze notification');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCustomSnooze = async () => {
    if (isSaving) {
      return;
    }

    if (customDate.getTime() <= Date.now()) {
      Alert.alert('Please select a future date and time');
      return;
    }

    try {
      setIsSaving(true);
      await snoozeNotificationToDate(title, body, data, customDate);
      navigation.goBack();
    } catch {
      Alert.alert('Unable to snooze notification');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDateChange = (
    event: DateTimePickerEvent,
    selectedDate?: Date,
  ) => {
    if (Platform.OS !== 'ios') {
      setShowDatePicker(false);
    }

    if (event.type === 'dismissed') {
      return;
    }

    if (selectedDate) {
      const d = new Date(customDate);
      d.setFullYear(
        selectedDate.getFullYear(),
        selectedDate.getMonth(),
        selectedDate.getDate(),
      );
      setCustomDate(d);
    }
  };

  const handleTimeChange = (
    event: DateTimePickerEvent,
    selectedDate?: Date,
  ) => {
    if (Platform.OS !== 'ios') {
      setShowTimePicker(false);
    }

    if (event.type === 'dismissed') {
      return;
    }

    if (selectedDate) {
      const d = new Date(customDate);
      d.setHours(selectedDate.getHours(), selectedDate.getMinutes(), 0, 0);
      setCustomDate(d);
    }
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
    >
      <View style={styles.previewCard}>
        <Text style={styles.previewTitle} numberOfLines={1}>
          {title}
        </Text>
        {body.length > 0 && (
          <Text style={styles.previewBody} numberOfLines={3}>
            {body}
          </Text>
        )}
      </View>

      <Text style={styles.sectionTitle}>Quick Snooze</Text>
      <View style={styles.optionsGrid}>
        {QUICK_OPTIONS.map((option) => (
          <Pressable
            key={option.label}
            onPress={() => {
              void handleQuickSnooze(option.durationMs);
            }}
            disabled={isSaving}
            style={({ pressed }) => [
              styles.optionButton,
              (pressed || isSaving) && styles.optionButtonPressed,
            ]}
          >
            <Text style={styles.optionText}>{option.label}</Text>
          </Pressable>
        ))}
      </View>

      <Text style={styles.sectionTitle}>Custom</Text>
      <View style={styles.customSection}>
        <Text style={styles.customDateLabel}>
          {formatDateTime(customDate)}
        </Text>

        <View style={styles.pickerButtonRow}>
          <Pressable
            onPress={() => setShowDatePicker(true)}
            style={({ pressed }) => [
              styles.pickerButton,
              pressed && styles.optionButtonPressed,
            ]}
          >
            <Text style={styles.pickerButtonText}>Pick Date</Text>
          </Pressable>

          <Pressable
            onPress={() => setShowTimePicker(true)}
            style={({ pressed }) => [
              styles.pickerButton,
              pressed && styles.optionButtonPressed,
            ]}
          >
            <Text style={styles.pickerButtonText}>Pick Time</Text>
          </Pressable>
        </View>

        {showDatePicker && (
          <DateTimePicker
            value={customDate}
            mode="date"
            minimumDate={new Date()}
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            themeVariant="dark"
            onChange={handleDateChange}
          />
        )}

        {showDatePicker && Platform.OS === 'ios' && (
          <Pressable
            onPress={() => setShowDatePicker(false)}
            style={({ pressed }) => [
              styles.inlineCloseButton,
              pressed && styles.optionButtonPressed,
            ]}
          >
            <Text style={styles.inlineCloseButtonText}>Done</Text>
          </Pressable>
        )}

        {showTimePicker && (
          <DateTimePicker
            value={customDate}
            mode="time"
            is24Hour
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            themeVariant="dark"
            onChange={handleTimeChange}
          />
        )}

        {showTimePicker && Platform.OS === 'ios' && (
          <Pressable
            onPress={() => setShowTimePicker(false)}
            style={({ pressed }) => [
              styles.inlineCloseButton,
              pressed && styles.optionButtonPressed,
            ]}
          >
            <Text style={styles.inlineCloseButtonText}>Done</Text>
          </Pressable>
        )}

        <Pressable
          onPress={() => {
            void handleCustomSnooze();
          }}
          disabled={isSaving}
          style={({ pressed }) => [
            styles.snoozeButton,
            (pressed || isSaving) && styles.snoozeButtonPressed,
          ]}
        >
          <Text style={styles.snoozeButtonText}>
            {isSaving ? 'Snoozing…' : `Snooze until ${formatDateTime(customDate)}`}
          </Text>
        </Pressable>
      </View>
    </ScrollView>
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
  previewCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: 12,
    padding: 14,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: theme.colors.border,
    gap: 4,
  },
  previewTitle: {
    color: theme.colors.text,
    fontSize: 16,
    fontWeight: '700',
  },
  previewBody: {
    color: theme.colors.textSecondary,
    fontSize: 14,
  },
  sectionTitle: {
    color: theme.colors.text,
    fontSize: 15,
    fontWeight: '600',
  },
  optionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  optionButton: {
    flex: 1,
    minWidth: '40%',
    minHeight: 52,
    borderRadius: 12,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  optionButtonPressed: {
    opacity: 0.8,
  },
  optionText: {
    color: theme.colors.text,
    fontSize: 15,
    fontWeight: '600',
  },
  customSection: {
    backgroundColor: theme.colors.surface,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: theme.colors.border,
    gap: 12,
  },
  customDateLabel: {
    color: theme.colors.text,
    fontSize: 16,
    fontWeight: '500',
    textAlign: 'center',
  },
  pickerButtonRow: {
    flexDirection: 'row',
    gap: 10,
  },
  pickerButton: {
    flex: 1,
    minHeight: 48,
    borderRadius: 10,
    backgroundColor: theme.colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pickerButtonText: {
    color: theme.colors.text,
    fontSize: 14,
    fontWeight: '600',
  },
  inlineCloseButton: {
    alignSelf: 'flex-end',
    minHeight: 40,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: theme.colors.surfaceAlt,
    justifyContent: 'center',
  },
  inlineCloseButtonText: {
    color: theme.colors.text,
    fontSize: 13,
    fontWeight: '600',
  },
  snoozeButton: {
    minHeight: 48,
    borderRadius: 10,
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  snoozeButtonPressed: {
    opacity: 0.85,
  },
  snoozeButtonText: {
    color: theme.colors.text,
    fontSize: 15,
    fontWeight: '700',
  },
});
