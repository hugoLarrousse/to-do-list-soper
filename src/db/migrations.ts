import { SQLiteDatabase } from 'expo-sqlite';
import { SettingsKey } from '@/types';

const CREATE_TABLES_SQL = `
CREATE TABLE IF NOT EXISTS actions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  list TEXT,
  sortIndex INTEGER NOT NULL,
  isDone INTEGER NOT NULL DEFAULT 0,
  createdAt INTEGER NOT NULL,
  updatedAt INTEGER NOT NULL,
  reminderType TEXT NOT NULL DEFAULT 'none',
  reminderDate INTEGER,
  reminderTime TEXT,
  reminderWeekday INTEGER,
  reminderMonthday INTEGER
);

CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS notification_meta (
  key TEXT PRIMARY KEY,
  notificationId TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_actions_list ON actions(list);
CREATE INDEX IF NOT EXISTS idx_actions_isDone ON actions(isDone);
CREATE INDEX IF NOT EXISTS idx_actions_sortIndex ON actions(sortIndex);
`;

export async function runMigrations(db: SQLiteDatabase): Promise<void> {
  await db.execAsync(CREATE_TABLES_SQL);

  await db.runAsync(
    'INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)',
    SettingsKey.PersoReminderTime,
    '08:00',
  );

  await db.runAsync(
    'INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)',
    SettingsKey.ProReminderTime,
    '13:00',
  );
}
