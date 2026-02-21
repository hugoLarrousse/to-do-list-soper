import { getDatabase } from '@/db/database';

type NotificationMetaRow = {
  key: string;
  notificationId: string;
};

export async function get(key: string): Promise<string | null> {
  const db = getDatabase();
  const row = await db.getFirstAsync<NotificationMetaRow>(
    'SELECT key, notificationId FROM notification_meta WHERE key = ?',
    key,
  );
  return row?.notificationId ?? null;
}

export async function set(key: string, notificationId: string): Promise<void> {
  const db = getDatabase();
  await db.runAsync(
    'INSERT OR REPLACE INTO notification_meta (key, notificationId) VALUES (?, ?)',
    key,
    notificationId,
  );
}

export async function deleteByKey(key: string): Promise<void> {
  const db = getDatabase();
  await db.runAsync('DELETE FROM notification_meta WHERE key = ?', key);
}

export async function deleteByPrefix(prefix: string): Promise<void> {
  const db = getDatabase();
  await db.runAsync(
    'DELETE FROM notification_meta WHERE key LIKE ?',
    `${prefix}%`,
  );
}
