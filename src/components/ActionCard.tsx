import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { theme } from '@/theme';
import { Action, ActionList, ReminderType } from '@/types';

type ActionCardProps = {
  action: Action;
  onPress: () => void;
  onLongPress?: () => void;
  showListBadge?: boolean;
  disabled?: boolean;
  index?: number;
};

function getListBadgeStyle(list: ActionList): {
  backgroundColor: string;
  label: string;
} {
  if (list === ActionList.Perso) {
    return {
      backgroundColor: theme.colors.perso,
      label: 'Perso',
    };
  }

  return {
    backgroundColor: theme.colors.pro,
    label: 'Pro',
  };
}

export default function ActionCard({
  action,
  onPress,
  onLongPress,
  showListBadge = true,
  disabled = false,
  index,
}: ActionCardProps) {
  const shouldShowBadge = showListBadge && action.list !== null;

  return (
    <Pressable
      onPress={onPress}
      onLongPress={onLongPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.card,
        pressed && styles.cardPressed,
      ]}
    >
      {index !== undefined && (
        <Text style={styles.indexNumber}>{index}</Text>
      )}
      <View style={styles.textContainer}>
        <Text
          numberOfLines={2}
          style={styles.title}
        >
          {action.title}
        </Text>
      </View>

      <View style={styles.metaContainer}>
        {shouldShowBadge && action.list !== null ? (
          <View
            style={[
              styles.badge,
              { backgroundColor: getListBadgeStyle(action.list).backgroundColor },
            ]}
          >
            <Text style={styles.badgeText}>
              {getListBadgeStyle(action.list).label}
            </Text>
          </View>
        ) : (
          <View style={styles.badgePlaceholder} />
        )}

        {action.reminderType !== ReminderType.None && (
          <Ionicons
            name="notifications-outline"
            size={18}
            color={theme.colors.text}
          />
        )}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    minHeight: 60,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: theme.colors.border,
  },
  cardPressed: {
    opacity: 0.9,
  },
  textContainer: {
    flex: 1,
    paddingRight: 12,
  },
  title: {
    color: theme.colors.text,
    fontSize: 16,
    fontWeight: '500',
  },
  metaContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  badge: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  badgeText: {
    color: theme.colors.black,
    fontSize: 12,
    fontWeight: '700',
  },
  badgePlaceholder: {
    width: 0,
    height: 0,
  },
  indexNumber: {
    color: theme.colors.textSecondary,
    fontSize: 14,
    fontWeight: '700',
    width: 28,
    textAlign: 'center',
  },
});
