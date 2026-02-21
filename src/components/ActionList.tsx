import { Ionicons } from '@expo/vector-icons';
import DraggableFlatList, {
  ScaleDecorator,
} from 'react-native-draggable-flatlist';
import SwipeableItem, {
  OpenDirection,
  SwipeableItemImperativeRef,
} from 'react-native-swipeable-item';
import {
  Alert,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useRef } from 'react';
import ActionCard from '@/components/ActionCard';
import { theme } from '@/theme';
import { Action } from '@/types';

type ActionListProps = {
  actions: Action[];
  onReorder: (fromIndex: number, toIndex: number) => void;
  onComplete: (id: number) => void;
  onDelete: (id: number) => void;
  onPress: (id: number) => void;
  showListBadge?: boolean;
};

const SWIPE_DISTANCE = 88;

type UnderlayProps = {
  icon: 'checkmark' | 'trash';
  label: string;
  backgroundColor: string;
  align: 'left' | 'right';
};

function Underlay({
  icon,
  label,
  backgroundColor,
  align,
}: UnderlayProps) {
  return (
    <View
      style={[
        styles.underlay,
        { backgroundColor },
        align === 'left' ? styles.underlayLeft : styles.underlayRight,
      ]}
    >
      <Ionicons
        name={icon}
        size={18}
        color={theme.colors.text}
      />
      <Text style={styles.underlayLabel}>{label}</Text>
    </View>
  );
}

export default function ActionList({
  actions,
  onReorder,
  onComplete,
  onDelete,
  onPress,
  showListBadge = true,
}: ActionListProps) {
  const itemRefs = useRef<Map<number, SwipeableItemImperativeRef>>(new Map());

  const closeItem = (id: number) => {
    const ref = itemRefs.current.get(id);
    if (ref) {
      void ref.close();
    }
  };

  const closeOtherOpenItems = (currentId: number) => {
    itemRefs.current.forEach((ref, itemId) => {
      if (itemId !== currentId) {
        void ref.close();
      }
    });
  };

  return (
    <DraggableFlatList
      data={actions}
      keyExtractor={(item) => `${item.id}`}
      activationDistance={16}
      contentContainerStyle={styles.listContent}
      onDragEnd={({ from, to }) => {
        if (from !== to) {
          onReorder(from, to);
        }
      }}
      renderItem={({ item, drag, isActive }) => (
        <ScaleDecorator>
          <SwipeableItem
            item={item}
            swipeEnabled={!isActive}
            overSwipe={10}
            snapPointsLeft={[SWIPE_DISTANCE]}
            snapPointsRight={[SWIPE_DISTANCE]}
            ref={(ref) => {
              if (ref) {
                itemRefs.current.set(item.id, ref);
              } else {
                itemRefs.current.delete(item.id);
              }
            }}
            onChange={({ openDirection, snapPoint }) => {
              if (openDirection === OpenDirection.NONE || snapPoint === 0) {
                return;
              }

              closeOtherOpenItems(item.id);

              if (openDirection === OpenDirection.RIGHT) {
                closeItem(item.id);
                onComplete(item.id);
                return;
              }

              if (openDirection === OpenDirection.LEFT) {
                Alert.alert(
                  'Delete this action?',
                  '',
                  [
                    {
                      text: 'Cancel',
                      style: 'cancel',
                      onPress: () => {
                        closeItem(item.id);
                      },
                    },
                    {
                      text: 'Delete',
                      style: 'destructive',
                      onPress: () => {
                        closeItem(item.id);
                        onDelete(item.id);
                      },
                    },
                  ],
                );
              }
            }}
            renderUnderlayLeft={() => (
              <Underlay
                icon="trash"
                label="Delete"
                backgroundColor={theme.colors.danger}
                align="right"
              />
            )}
            renderUnderlayRight={() => (
              <Underlay
                icon="checkmark"
                label="Complete"
                backgroundColor={theme.colors.success}
                align="left"
              />
            )}
          >
            <ActionCard
              action={item}
              onPress={() => onPress(item.id)}
              onLongPress={drag}
              showListBadge={showListBadge}
              disabled={isActive}
            />
          </SwipeableItem>
        </ScaleDecorator>
      )}
    />
  );
}

const styles = StyleSheet.create({
  listContent: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 10,
    backgroundColor: theme.colors.background,
  },
  underlay: {
    flex: 1,
    borderRadius: 12,
    paddingHorizontal: 18,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  underlayLeft: {
    justifyContent: 'flex-start',
  },
  underlayRight: {
    justifyContent: 'flex-end',
  },
  underlayLabel: {
    color: theme.colors.text,
    fontSize: 13,
    fontWeight: '700',
  },
});
