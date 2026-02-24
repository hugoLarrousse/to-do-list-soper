import * as Notifications from 'expo-notifications';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Platform,
  StyleSheet,
  ToastAndroid,
  View,
} from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { initDatabase } from '@/db/database';
import RootNavigator, { navigationRef } from '@/navigation/RootNavigator';
import * as settingsRepo from '@/repos/settingsRepo';
import { getListReminderKey, refreshListReminders } from '@/services/listReminderService';
import {
  SNOOZE_10M,
  SNOOZE_1H,
  SNOOZE_MORE,
  setupNotificationCategories,
} from '@/services/notificationSetup';
import '@/services/notificationSetup'; // registers foreground handler at module scope
import { getActionReminderKey } from '@/services/reminderService';
import {
  snoozeNotification,
  SNOOZE_DURATIONS,
  SNOOZE_META_KEY_FIELD,
} from '@/services/snoozeService';
import { theme } from '@/theme';
import { ActionList, SettingsKey } from '@/types';

function resolveSnoozeMetaKey(data: Record<string, unknown>): string | null {
  const existingKey = data[SNOOZE_META_KEY_FIELD];
  if (typeof existingKey === 'string' && existingKey.length > 0) {
    return existingKey;
  }

  if (data.type === 'action_reminder') {
    const rawActionId = data.actionId;
    const actionId =
      typeof rawActionId === 'number'
        ? rawActionId
        : Number.parseInt(`${rawActionId ?? ''}`, 10);

    if (Number.isFinite(actionId)) {
      return getActionReminderKey(actionId);
    }
  }

  if (data.type === 'list_reminder') {
    const listValue = data.list;
    if (listValue === ActionList.Perso || listValue === ActionList.Pro) {
      return getListReminderKey(listValue);
    }
  }

  return null;
}

function buildSnoozeData(
  data: Record<string, unknown>,
  trigger: Notifications.NotificationTrigger | null,
): Record<string, unknown> {
  const existingMetaKey = data[SNOOZE_META_KEY_FIELD];
  if (typeof existingMetaKey === 'string' && existingMetaKey.length > 0) {
    return data;
  }

  const isDateTrigger =
    !!trigger &&
    typeof trigger === 'object' &&
    'type' in trigger &&
    trigger.type === Notifications.SchedulableTriggerInputTypes.DATE;

  if (!isDateTrigger) {
    return data;
  }

  const metaKey = resolveSnoozeMetaKey(data);
  if (!metaKey) {
    return data;
  }

  return {
    ...data,
    [SNOOZE_META_KEY_FIELD]: metaKey,
  };
}

async function shouldShowNotificationDebugFeedback(): Promise<boolean> {
  try {
    return (await settingsRepo.get(SettingsKey.NotificationActionDebugFeedback)) === '1';
  } catch {
    return false;
  }
}

function showDebugFeedback(message: string): void {
  if (Platform.OS === 'android') {
    ToastAndroid.show(message, ToastAndroid.SHORT);
    return;
  }

  Alert.alert(message);
}

export default function App() {
  const [isDatabaseReady, setIsDatabaseReady] = useState(false);
  const [databaseInitError, setDatabaseInitError] = useState<Error | null>(null);
  const handledResponseRef = useRef<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    const bootstrap = async () => {
      try {
        await initDatabase();
        try {
          await setupNotificationCategories();
        } catch {
          // Non-fatal: snooze buttons won't appear but app still works.
        }
        try {
          await refreshListReminders();
        } catch {
          // Keep app startup non-blocking if notifications cannot be refreshed.
        }
        if (isMounted) {
          setIsDatabaseReady(true);
        }
      } catch (error) {
        if (isMounted) {
          setDatabaseInitError(
            error instanceof Error
              ? error
              : new Error('Unknown database initialization error'),
          );
        }
      }
    };

    void bootstrap();

    return () => {
      isMounted = false;
    };
  }, []);

  // --- Notification response handler ---
  const lastResponse = Notifications.useLastNotificationResponse();

  useEffect(() => {
    if (!lastResponse || !isDatabaseReady) {
      return;
    }

    const responseKey =
      lastResponse.notification.request.identifier +
      ':' +
      lastResponse.actionIdentifier;

    if (handledResponseRef.current === responseKey) {
      return;
    }

    handledResponseRef.current = responseKey;

    const { actionIdentifier } = lastResponse;
    const { request } = lastResponse.notification;
    const content = request.content;
    const sourceNotificationId = request.identifier;
    const sourceTrigger = request.trigger ?? null;
    const notifTitle = content.title ?? '';
    const notifBody = content.body ?? '';
    const notifData = (content.data ?? {}) as Record<string, unknown>;
    const snoozeData = buildSnoozeData(notifData, sourceTrigger);

    const dismissHandledNotification = async () => {
      try {
        await Notifications.dismissNotificationAsync(sourceNotificationId);
      } catch {
        // Ignore dismiss failures if the notification is already gone.
      }

      try {
        await Notifications.clearLastNotificationResponseAsync();
      } catch {
        // Ignore cleanup failures; response deduping still protects against loops.
      }
    };

    if (actionIdentifier === SNOOZE_10M) {
      void (async () => {
        let isScheduled = false;
        try {
          await snoozeNotification(
            notifTitle,
            notifBody,
            snoozeData,
            SNOOZE_DURATIONS['10min'],
          );
          isScheduled = true;
          if (await shouldShowNotificationDebugFeedback()) {
            showDebugFeedback('Snoozed for 10 minutes');
          }
        } catch {
          if (await shouldShowNotificationDebugFeedback()) {
            showDebugFeedback('Unable to snooze (10 min)');
          }
        } finally {
          if (isScheduled) {
            await dismissHandledNotification();
            return;
          }

          void Notifications.clearLastNotificationResponseAsync();
        }
      })();
      return;
    }

    if (actionIdentifier === SNOOZE_1H) {
      void (async () => {
        let isScheduled = false;
        try {
          await snoozeNotification(
            notifTitle,
            notifBody,
            snoozeData,
            SNOOZE_DURATIONS['1h'],
          );
          isScheduled = true;
          if (await shouldShowNotificationDebugFeedback()) {
            showDebugFeedback('Snoozed for 1 hour');
          }
        } catch {
          if (await shouldShowNotificationDebugFeedback()) {
            showDebugFeedback('Unable to snooze (1 hour)');
          }
        } finally {
          if (isScheduled) {
            await dismissHandledNotification();
            return;
          }

          void Notifications.clearLastNotificationResponseAsync();
        }
      })();
      return;
    }

    if (actionIdentifier === SNOOZE_MORE) {
      void (async () => {
        await dismissHandledNotification();
        if (navigationRef.isReady()) {
          navigationRef.navigate('Snooze', {
            title: notifTitle,
            body: notifBody,
            data: snoozeData,
          });
        }
      })();
      return;
    }

    void Notifications.clearLastNotificationResponseAsync();
  }, [lastResponse, isDatabaseReady]);

  if (databaseInitError) {
    throw databaseInitError;
  }

  return (
    <GestureHandlerRootView style={styles.root}>
      <StatusBar style="light" />
      {isDatabaseReady ? (
        <RootNavigator />
      ) : (
        <View style={styles.loadingContainer}>
          <ActivityIndicator
            color={theme.colors.primary}
            size="large"
          />
        </View>
      )}
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: theme.colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
