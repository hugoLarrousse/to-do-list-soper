import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { initDatabase } from '@/db/database';
import RootNavigator from '@/navigation/RootNavigator';
import { refreshListReminders } from '@/services/listReminderService';
import { theme } from '@/theme';

export default function App() {
  const [isDatabaseReady, setIsDatabaseReady] = useState(false);
  const [databaseInitError, setDatabaseInitError] = useState<Error | null>(null);

  useEffect(() => {
    let isMounted = true;

    const bootstrap = async () => {
      try {
        await initDatabase();
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
