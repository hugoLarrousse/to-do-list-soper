import { useCallback, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { CompositeNavigationProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ActionList, FAB } from '@/components';
import { MainTabsParamList } from '@/navigation/MainTabs';
import { RootStackParamList } from '@/navigation/RootNavigator';
import * as actionRepo from '@/repos/actionRepo';
import { refreshListReminders } from '@/services/listReminderService';
import { cancelActionReminder } from '@/services/reminderService';
import * as sortService from '@/services/sortService';
import { theme } from '@/theme';
import { Action } from '@/types';

const SORT_GAP = 1000;

type ElementsScreenNavigationProp = CompositeNavigationProp<
  BottomTabNavigationProp<MainTabsParamList, 'Elements'>,
  NativeStackNavigationProp<RootStackParamList>
>;

function moveItem<T>(items: T[], fromIndex: number, toIndex: number): T[] {
  const next = [...items];
  const [moved] = next.splice(fromIndex, 1);
  next.splice(toIndex, 0, moved);
  return next;
}

function findPreviousWithSameList(
  actions: Action[],
  startIndex: number,
  list: Action['list'],
): Action | undefined {
  for (let index = startIndex; index >= 0; index -= 1) {
    if (actions[index].list === list) {
      return actions[index];
    }
  }
  return undefined;
}

function findNextWithSameList(
  actions: Action[],
  startIndex: number,
  list: Action['list'],
): Action | undefined {
  for (let index = startIndex; index < actions.length; index += 1) {
    if (actions[index].list === list) {
      return actions[index];
    }
  }
  return undefined;
}

export default function ElementsScreen() {
  const navigation = useNavigation<ElementsScreenNavigationProp>();
  const insets = useSafeAreaInsets();
  const [actions, setActions] = useState<Action[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadActions = useCallback(async () => {
    const data = await actionRepo.getAllActive();
    setActions(data);
  }, []);

  useFocusEffect(
    useCallback(() => {
      let isMounted = true;

      const refresh = async () => {
        try {
          const data = await actionRepo.getAllActive();
          if (isMounted) {
            setActions(data);
          }
        } finally {
          if (isMounted) {
            setIsLoading(false);
          }
        }
      };

      void refresh();

      return () => {
        isMounted = false;
      };
    }, []),
  );

  const handleComplete = useCallback(async (id: number) => {
    await actionRepo.markDone(id);
    await cancelActionReminder(id);
    try {
      await refreshListReminders();
    } catch {
      // Ignore reminder refresh failures so complete action still succeeds.
    }
    setActions((previous) => previous.filter((action) => action.id !== id));
  }, []);

  const handleDelete = useCallback(async (id: number) => {
    await actionRepo.deleteById(id);
    await cancelActionReminder(id);
    try {
      await refreshListReminders();
    } catch {
      // Ignore reminder refresh failures so delete action still succeeds.
    }
    setActions((previous) => previous.filter((action) => action.id !== id));
  }, []);

  const handleReorder = useCallback(
    async (fromIndex: number, toIndex: number) => {
      if (fromIndex === toIndex || actions.length < 2) {
        return;
      }

      const reordered = moveItem(actions, fromIndex, toIndex);
      const movedAction = reordered[toIndex];

      if (!movedAction) {
        return;
      }

      const beforeAction = findPreviousWithSameList(
        reordered,
        toIndex - 1,
        movedAction.list,
      );
      const afterAction = findNextWithSameList(
        reordered,
        toIndex + 1,
        movedAction.list,
      );

      setActions(reordered);

      let nextSortIndex: number;
      if (beforeAction && afterAction) {
        const gap = Math.abs(afterAction.sortIndex - beforeAction.sortIndex);
        if (gap < 2) {
          const sameListIds = reordered
            .filter((action) => action.list === movedAction.list)
            .map((action) => action.id);

          await sortService.persistReorderedSortIndexes(
            sameListIds,
          );
          await loadActions();
          return;
        }

        nextSortIndex = await sortService.computeSortIndexBetween(
          beforeAction.sortIndex,
          afterAction.sortIndex,
          movedAction.list,
        );
      } else if (!beforeAction && afterAction) {
        nextSortIndex = afterAction.sortIndex - SORT_GAP;
      } else if (beforeAction && !afterAction) {
        nextSortIndex = beforeAction.sortIndex + SORT_GAP;
      } else {
        await loadActions();
        return;
      }

      await actionRepo.updateSortIndex(movedAction.id, nextSortIndex);
      await loadActions();
    },
    [actions, loadActions],
  );

  const handlePressAction = useCallback(
    (actionId: number) => {
      navigation.navigate('EditAction', { actionId });
    },
    [navigation],
  );

  const handlePressAdd = useCallback(() => {
    navigation.navigate('AddAction');
  }, [navigation]);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <Text style={styles.title}>Elements</Text>

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator
            color={theme.colors.primary}
            size="large"
          />
        </View>
      ) : (
        <ActionList
          actions={actions}
          onReorder={(fromIndex, toIndex) => {
            void handleReorder(fromIndex, toIndex);
          }}
          onComplete={(id) => {
            void handleComplete(id);
          }}
          onDelete={(id) => {
            void handleDelete(id);
          }}
          onPress={handlePressAction}
        />
      )}

      <FAB onPress={handlePressAdd} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  title: {
    color: theme.colors.text,
    fontSize: 28,
    fontWeight: '700',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
