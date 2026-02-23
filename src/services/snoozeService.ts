import * as Notifications from 'expo-notifications';
import { CATEGORY_SNOOZE } from './notificationSetup';

// --- Snooze duration presets ---

export const SNOOZE_DURATIONS = {
  '10min': 10 * 60 * 1000,
  '1h': 60 * 60 * 1000,
  '1d': 24 * 60 * 60 * 1000,
  '1w': 7 * 24 * 60 * 60 * 1000,
} as const;

export type SnoozeDurationKey = keyof typeof SNOOZE_DURATIONS;

/**
 * Schedule a snoozed copy of a notification after a relative delay.
 * The new notification re-uses the CATEGORY_SNOOZE category so it can
 * be snoozed again.
 */
export async function snoozeNotification(
  title: string,
  body: string,
  data: Record<string, unknown>,
  delayMs: number,
): Promise<void> {
  await Notifications.scheduleNotificationAsync({
    content: {
      title,
      body,
      data,
      categoryIdentifier: CATEGORY_SNOOZE,
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: new Date(Date.now() + delayMs),
    },
  });
}

/**
 * Schedule a snoozed copy of a notification at an absolute date/time.
 */
export async function snoozeNotificationToDate(
  title: string,
  body: string,
  data: Record<string, unknown>,
  date: Date,
): Promise<void> {
  await Notifications.scheduleNotificationAsync({
    content: {
      title,
      body,
      data,
      categoryIdentifier: CATEGORY_SNOOZE,
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date,
    },
  });
}
