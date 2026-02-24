import * as Notifications from 'expo-notifications';
import * as actionRepo from '@/repos/actionRepo';
import * as notificationMetaRepo from '@/repos/notificationMetaRepo';
import * as settingsRepo from '@/repos/settingsRepo';
import { CATEGORY_LIST_REMINDER } from '@/services/notificationSetup';
import { ActionList, SettingsKey } from '@/types';

export type SupportedList = ActionList.Perso | ActionList.Pro;

const DEFAULT_REMINDER_TIMES: Record<SupportedList, string> = {
  [ActionList.Perso]: '08:00',
  [ActionList.Pro]: '13:00',
};

export function getListReminderKey(list: SupportedList): string {
  return `list_${list}`;
}

function getListDisplayName(list: SupportedList): string {
  return list === ActionList.Perso ? 'Perso' : 'Pro';
}

function parseTime(value: string): {
  hour: number;
  minute: number;
} {
  const [hourRaw, minuteRaw] = value.split(':');
  const parsedHour = Number.parseInt(hourRaw ?? '0', 10);
  const parsedMinute = Number.parseInt(minuteRaw ?? '0', 10);

  const hour = Number.isFinite(parsedHour) ? parsedHour : 0;
  const minute = Number.isFinite(parsedMinute) ? parsedMinute : 0;

  return {
    hour: Math.max(0, Math.min(23, hour)),
    minute: Math.max(0, Math.min(59, minute)),
  };
}

function computeNextTriggerDate(time: string): Date {
  const { hour, minute } = parseTime(time);

  const now = new Date();
  const nextTrigger = new Date(now);
  nextTrigger.setHours(hour, minute, 0, 0);

  if (nextTrigger.getTime() <= now.getTime()) {
    nextTrigger.setDate(nextTrigger.getDate() + 1);
  }

  return nextTrigger;
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

async function resolveReminderTime(list: SupportedList): Promise<string> {
  const settingKey =
    list === ActionList.Perso
      ? SettingsKey.PersoReminderTime
      : SettingsKey.ProReminderTime;

  const value = await settingsRepo.get(settingKey);
  return value ?? DEFAULT_REMINDER_TIMES[list];
}

async function buildNotificationBody(
  list: SupportedList,
  count: number,
): Promise<string> {
  const taskLabel = count === 1 ? 'task' : 'tasks';
  let body = `${count} ${taskLabel} remaining`;

  if (count > 0) {
    const topTasks = await actionRepo.getTopActiveByList(list, 3);
    const lines = topTasks.map((task, index) => `${index + 1}. ${task.title}`);
    body += `\n${lines.join('\n')}`;

    if (count > 3) {
      body += `\n…and ${count - 3} more`;
    }
  }

  return body;
}

async function scheduleListReminderWithPermission(
  list: SupportedList,
  time: string,
): Promise<void> {
  const count = await actionRepo.getActiveCountByList(list);
  const body = await buildNotificationBody(list, count);
  const notificationId = await Notifications.scheduleNotificationAsync({
    content: {
      title: getListDisplayName(list),
      body,
      categoryIdentifier: CATEGORY_LIST_REMINDER,
      data: { type: 'list_reminder', list },
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: computeNextTriggerDate(time),
    },
  });

  await notificationMetaRepo.set(getListReminderKey(list), notificationId);
}

export async function scheduleListReminder(
  list: SupportedList,
  time: string,
): Promise<void> {
  const hasPermission = await ensureNotificationPermission();
  if (!hasPermission) {
    return;
  }

  await scheduleListReminderWithPermission(list, time);
}

export async function cancelListReminder(list: SupportedList): Promise<void> {
  const key = getListReminderKey(list);
  const notificationId = await notificationMetaRepo.get(key);

  if (notificationId) {
    try {
      await Notifications.cancelScheduledNotificationAsync(notificationId);
    } finally {
      await notificationMetaRepo.deleteByKey(key);
    }
    return;
  }

  await notificationMetaRepo.deleteByKey(key);
}

export async function refreshListReminders(): Promise<void> {
  const hasPermission = await ensureNotificationPermission();
  if (!hasPermission) {
    return;
  }

  const lists: SupportedList[] = [ActionList.Perso, ActionList.Pro];

  for (const list of lists) {
    await cancelListReminder(list);
    const time = await resolveReminderTime(list);
    await scheduleListReminderWithPermission(list, time);
  }
}
