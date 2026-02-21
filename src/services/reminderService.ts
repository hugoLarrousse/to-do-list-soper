import * as Notifications from 'expo-notifications';
import * as notificationMetaRepo from '@/repos/notificationMetaRepo';
import { Action, ReminderType } from '@/types';

function getActionReminderKey(actionId: number): string {
  return `action_${actionId}`;
}

function parseTime(value: string): {
  hour: number;
  minute: number;
} {
  const [hourRaw, minuteRaw] = value.split(':');
  const parsedHour = Number.parseInt(hourRaw ?? '0', 10);
  const parsedMinute = Number.parseInt(minuteRaw ?? '0', 10);

  return {
    hour: Number.isFinite(parsedHour) ? parsedHour : 0,
    minute: Number.isFinite(parsedMinute) ? parsedMinute : 0,
  };
}

function toExpoWeekday(isoWeekday: number): number {
  return (isoWeekday % 7) + 1;
}

async function ensureNotificationPermission(): Promise<boolean> {
  const currentPermissions = await Notifications.getPermissionsAsync();
  if (currentPermissions.granted) {
    return true;
  }

  if (!currentPermissions.canAskAgain) {
    return false;
  }

  const requestedPermissions = await Notifications.requestPermissionsAsync();
  return requestedPermissions.granted;
}

function getActionTrigger(
  action: Action,
): Notifications.SchedulableNotificationTriggerInput | null {
  if (action.reminderType === ReminderType.None) {
    return null;
  }

  if (action.reminderType === ReminderType.Once) {
    if (!action.reminderDate) {
      return null;
    }

    return {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: new Date(action.reminderDate),
    };
  }

  if (!action.reminderTime) {
    return null;
  }

  const { hour, minute } = parseTime(action.reminderTime);

  if (action.reminderType === ReminderType.Daily) {
    return {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour,
      minute,
    };
  }

  if (action.reminderType === ReminderType.Weekly) {
    if (!action.reminderWeekday) {
      return null;
    }

    return {
      type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
      weekday: toExpoWeekday(action.reminderWeekday),
      hour,
      minute,
    };
  }

  if (!action.reminderMonthday) {
    return null;
  }

  return {
    type: Notifications.SchedulableTriggerInputTypes.CALENDAR,
    repeats: true,
    day: action.reminderMonthday,
    hour,
    minute,
  };
}

export async function scheduleActionReminder(action: Action): Promise<void> {
  if (action.reminderType === ReminderType.None) {
    return;
  }

  const hasPermission = await ensureNotificationPermission();
  if (!hasPermission) {
    return;
  }

  const trigger = getActionTrigger(action);
  if (!trigger) {
    return;
  }

  const notificationId = await Notifications.scheduleNotificationAsync({
    content: {
      title: 'Reminder',
      body: action.title,
    },
    trigger,
  });

  await notificationMetaRepo.set(
    getActionReminderKey(action.id),
    notificationId,
  );
}

export async function cancelActionReminder(actionId: number): Promise<void> {
  const key = getActionReminderKey(actionId);
  const notificationId = await notificationMetaRepo.get(key);

  if (!notificationId) {
    return;
  }

  try {
    await Notifications.cancelScheduledNotificationAsync(notificationId);
  } finally {
    await notificationMetaRepo.deleteByKey(key);
  }
}

export async function rescheduleActionReminder(action: Action): Promise<void> {
  await cancelActionReminder(action.id);
  await scheduleActionReminder(action);
}
