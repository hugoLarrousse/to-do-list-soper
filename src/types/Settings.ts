export enum SettingsKey {
  PersoReminderTime = 'perso_reminder_time',
  ProReminderTime = 'pro_reminder_time',
}

export interface Settings {
  key: SettingsKey;
  value: string;
}
