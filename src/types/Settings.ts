export enum SettingsKey {
  PersoReminderTime = 'perso_reminder_time',
  ProReminderTime = 'pro_reminder_time',
  NotificationActionDebugFeedback = 'notification_action_debug_feedback',
}

export interface Settings {
  key: SettingsKey;
  value: string;
}
