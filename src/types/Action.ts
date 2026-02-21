export enum ReminderType {
  None = 'none',
  Once = 'once',
  Daily = 'daily',
  Weekly = 'weekly',
  Monthly = 'monthly',
}

export enum ActionList {
  Perso = 'perso',
  Pro = 'pro',
}

export interface Action {
  id: number;
  title: string;
  list: ActionList | null;
  sortIndex: number;
  isDone: boolean;
  createdAt: number;
  updatedAt: number;
  reminderType: ReminderType;
  reminderDate: number | null;
  reminderTime: string | null;
  reminderWeekday: number | null;
  reminderMonthday: number | null;
}
