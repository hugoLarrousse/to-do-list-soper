import * as Notifications from 'expo-notifications';

// --- Notification categories (with snooze action buttons) ---

export const CATEGORY_ACTION_REMINDER = 'action_reminder';
export const CATEGORY_LIST_REMINDER = 'list_reminder';
export const CATEGORY_SNOOZE = 'snooze';

export const SNOOZE_10M = 'SNOOZE_10M';
export const SNOOZE_1H = 'SNOOZE_1H';
export const SNOOZE_MORE = 'SNOOZE_MORE';

const SNOOZE_ACTIONS: Notifications.NotificationAction[] = [
  {
    identifier: SNOOZE_10M,
    buttonTitle: '10 min',
    options: { opensAppToForeground: false },
  },
  {
    identifier: SNOOZE_1H,
    buttonTitle: '1 hour',
    options: { opensAppToForeground: false },
  },
  {
    identifier: SNOOZE_MORE,
    buttonTitle: 'More…',
    options: { opensAppToForeground: true },
  },
];

/**
 * Register notification categories so every scheduled notification can show
 * inline snooze action buttons (10 min / 1 hour / More…).
 *
 * Must be called once during app bootstrap, after DB init.
 */
export async function setupNotificationCategories(): Promise<void> {
  await Promise.all([
    Notifications.setNotificationCategoryAsync(CATEGORY_ACTION_REMINDER, SNOOZE_ACTIONS),
    Notifications.setNotificationCategoryAsync(CATEGORY_LIST_REMINDER, SNOOZE_ACTIONS),
    Notifications.setNotificationCategoryAsync(CATEGORY_SNOOZE, SNOOZE_ACTIONS),
  ]);
}

// --- Foreground notification display handler ---
// Called at module scope so notifications are visible while the app is open.

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});
