import * as Notifications from 'expo-notifications';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { initDatabase } from '@/db/database';
import RootNavigator, { navigationRef } from '@/navigation/RootNavigator';
import { refreshListReminders } from '@/services/listReminderService';
import {
  SNOOZE_10M,
  SNOOZE_1H,
  SNOOZE_MORE,
  setupNotificationCategories,
} from '@/services/notificationSetup';
import '@/services/notificationSetup'; // registers foreground handler at module scope
import { snoozeNotification, SNOOZE_DURATIONS } from '@/services/snoozeService';
import { theme } from '@/theme';

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
    const content = lastResponse.notification.request.content;
    const notifTitle = content.title ?? '';
    const notifBody = content.body ?? '';
    const notifData = (content.data ?? {}) as Record<string, unknown>;

    if (actionIdentifier === SNOOZE_10M) {
      void snoozeNotification(
        notifTitle,
        notifBody,
        notifData,
        SNOOZE_DURATIONS['10min'],
      );
      return;
    }

    if (actionIdentifier === SNOOZE_1H) {
      void snoozeNotification(
        notifTitle,
        notifBody,
        notifData,
        SNOOZE_DURATIONS['1h'],
      );
      return;
    }

    if (actionIdentifier === SNOOZE_MORE) {
      if (navigationRef.isReady()) {
        navigationRef.navigate('Snooze', {
          title: notifTitle,
          body: notifBody,
          data: notifData,
        });
      }
    }
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
