import { useCallback, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { MaterialTopTabNavigationProp } from '@react-navigation/material-top-tabs';
import { CompositeNavigationProp, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ActionList as ActionListComponent, FAB } from '@/components';
import { ListsTabsParamList } from '@/navigation/ListsTabs';
import { RootStackParamList } from '@/navigation/RootNavigator';
import * as actionRepo from '@/repos/actionRepo';
import { refreshListReminders } from '@/services/listReminderService';
import { cancelActionReminder } from '@/services/reminderService';
import * as sortService from '@/services/sortService';
import { theme } from '@/theme';
import { Action, ActionList } from '@/types';

const SORT_GAP = 1000;

type PersoTabNavigationProp = CompositeNavigationProp<
  MaterialTopTabNavigationProp<ListsTabsParamList, 'Perso'>,
  NativeStackNavigationProp<RootStackParamList>
>;

function moveItem<T>(items: T[], fromIndex: number, toIndex: number): T[] {
  const next = [...items];
  const [moved] = next.splice(fromIndex, 1);
  next.splice(toIndex, 0, moved);
  return next;
}

export default function PersoTab() {
  const navigation = useNavigation<PersoTabNavigationProp>();
  const [actions, setActions] = useState<Action[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadActions = useCallback(async () => {
    const data = await actionRepo.getActiveByList(ActionList.Perso);
    setActions(data);
  }, []);

  useFocusEffect(
    useCallback(() => {
      let isMounted = true;

      const refresh = async () => {
        try {
          const data = await actionRepo.getActiveByList(ActionList.Perso);
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
      const beforeAction = reordered[toIndex - 1];
      const afterAction = reordered[toIndex + 1];

      if (!movedAction) {
        return;
      }

      setActions(reordered);

      let nextSortIndex: number;
      if (beforeAction && afterAction) {
        const gap = Math.abs(afterAction.sortIndex - beforeAction.sortIndex);
        if (gap < 2) {
          await sortService.persistReorderedSortIndexes(
            reordered.map((action) => action.id),
          );
          await loadActions();
          return;
        }

        nextSortIndex = await sortService.computeSortIndexBetween(
          beforeAction.sortIndex,
          afterAction.sortIndex,
          ActionList.Perso,
        );
      } else if (!beforeAction && afterAction) {
        nextSortIndex = afterAction.sortIndex - SORT_GAP;
      } else if (beforeAction && !afterAction) {
        nextSortIndex = beforeAction.sortIndex + SORT_GAP;
      } else {
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
    navigation.navigate('AddAction', { list: ActionList.Perso });
  }, [navigation]);

  return (
    <View style={styles.container}>
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator
            color={theme.colors.primary}
            size="large"
          />
        </View>
      ) : (
        <ActionListComponent
          actions={actions}
          showListBadge={false}
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
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
