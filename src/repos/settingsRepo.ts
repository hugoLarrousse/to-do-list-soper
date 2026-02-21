import { getDatabase } from '@/db/database';

type SettingsRow = {
  key: string;
  value: string;
};

export async function get(key: string): Promise<string | null> {
  const db = getDatabase();
  const row = await db.getFirstAsync<SettingsRow>(
    'SELECT key, value FROM settings WHERE key = ?',
    key,
  );
  return row?.value ?? null;
}

export async function set(key: string, value: string): Promise<void> {
  const db = getDatabase();
  await db.runAsync(
    'INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)',
    key,
    value,
  );
}

export async function getAll(): Promise<Record<string, string>> {
  const db = getDatabase();
  const rows = await db.getAllAsync<SettingsRow>('SELECT key, value FROM settings');
  return rows.reduce<Record<string, string>>((accumulator, row) => {
    accumulator[row.key] = row.value;
    return accumulator;
  }, {});
}
