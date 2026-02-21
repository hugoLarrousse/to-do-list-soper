import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import TimePicker from '@/components/TimePicker';
import * as settingsRepo from '@/repos/settingsRepo';
import {
  cancelListReminder,
  scheduleListReminder,
} from '@/services/listReminderService';
import * as exportService from '@/services/exportService';
import { theme } from '@/theme';
import { ActionList, SettingsKey } from '@/types';

const DEFAULT_PERSO_TIME = '08:00';
const DEFAULT_PRO_TIME = '13:00';

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const [persoReminderTime, setPersoReminderTime] = useState(DEFAULT_PERSO_TIME);
  const [proReminderTime, setProReminderTime] = useState(DEFAULT_PRO_TIME);
  const [isLoading, setIsLoading] = useState(true);
  const [isExportingCSV, setIsExportingCSV] = useState(false);
  const [isExportingJSON, setIsExportingJSON] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const loadSettings = async () => {
      try {
        const [persoValue, proValue] = await Promise.all([
          settingsRepo.get(SettingsKey.PersoReminderTime),
          settingsRepo.get(SettingsKey.ProReminderTime),
        ]);

        if (!isMounted) {
          return;
        }

        setPersoReminderTime(persoValue ?? DEFAULT_PERSO_TIME);
        setProReminderTime(proValue ?? DEFAULT_PRO_TIME);
      } catch {
        if (isMounted) {
          Alert.alert('Unable to load settings');
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    void loadSettings();

    return () => {
      isMounted = false;
    };
  }, []);

  const updateListReminderTime = async (
    list: ActionList.Perso | ActionList.Pro,
    nextTime: string,
  ) => {
    const settingKey = list === ActionList.Perso
      ? SettingsKey.PersoReminderTime
      : SettingsKey.ProReminderTime;

    const updateUI = list === ActionList.Perso
      ? setPersoReminderTime
      : setProReminderTime;

    updateUI(nextTime);

    try {
      await settingsRepo.set(settingKey, nextTime);
      await cancelListReminder(list);
      await scheduleListReminder(list, nextTime);
    } catch {
      Alert.alert('Unable to update reminder time');
    }
  };

  const handleExportCSV = async () => {
    if (isExportingCSV) {
      return;
    }

    try {
      setIsExportingCSV(true);
      await exportService.exportCSV();
    } catch {
      Alert.alert('Unable to export CSV');
    } finally {
      setIsExportingCSV(false);
    }
  };

  const handleExportJSON = async () => {
    if (isExportingJSON) {
      return;
    }

    try {
      setIsExportingJSON(true);
      await exportService.exportJSON();
    } catch {
      Alert.alert('Unable to export JSON');
    } finally {
      setIsExportingJSON(false);
    }
  };

  if (isLoading) {
    return (
      <View style={[styles.loadingContainer, { paddingTop: insets.top }]}>
        <ActivityIndicator
          color={theme.colors.primary}
          size="large"
        />
      </View>
    );
  }

  return (
    <ScrollView
      style={[styles.container, { paddingTop: insets.top }]}
      contentContainerStyle={styles.content}
    >
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Perso Reminder Time</Text>
        <TimePicker
          value={persoReminderTime}
          onChange={(value) => {
            void updateListReminderTime(ActionList.Perso, value);
          }}
        />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Pro Reminder Time</Text>
        <TimePicker
          value={proReminderTime}
          onChange={(value) => {
            void updateListReminderTime(ActionList.Pro, value);
          }}
        />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Export Data</Text>
        <Pressable
          onPress={() => {
            void handleExportCSV();
          }}
          disabled={isExportingCSV}
          style={({ pressed }) => [
            styles.button,
            (pressed || isExportingCSV) && styles.buttonPressed,
          ]}
        >
          <Text style={styles.buttonText}>
            {isExportingCSV ? 'Exporting CSV...' : 'Export as CSV'}
          </Text>
        </Pressable>

        <Pressable
          onPress={() => {
            void handleExportJSON();
          }}
          disabled={isExportingJSON}
          style={({ pressed }) => [
            styles.button,
            (pressed || isExportingJSON) && styles.buttonPressed,
          ]}
        >
          <Text style={styles.buttonText}>
            {isExportingJSON ? 'Exporting JSON...' : 'Export as JSON'}
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
    gap: 20,
    paddingBottom: 28,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: theme.colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  section: {
    gap: 10,
    padding: 14,
    borderRadius: 12,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  sectionTitle: {
    color: theme.colors.text,
    fontSize: 16,
    fontWeight: '700',
  },
  button: {
    minHeight: 48,
    borderRadius: 10,
    backgroundColor: theme.colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  buttonPressed: {
    opacity: 0.9,
  },
  buttonText: {
    color: theme.colors.text,
    fontSize: 15,
    fontWeight: '600',
  },
});
