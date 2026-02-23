import { getDatabase } from '@/db/database';
import { Action, ActionList, ReminderType } from '@/types';

const SORT_GAP = 1000;

type ActionRow = {
  id: number;
  title: string;
  list: string | null;
  sortIndex: number;
  isDone: number;
  createdAt: number;
  updatedAt: number;
  reminderType: string;
  reminderDate: number | null;
  reminderTime: string | null;
  reminderWeekday: number | null;
  reminderMonthday: number | null;
};

type SortIndexAggregate = {
  value: number | null;
};

type IdRow = {
  id: number;
};

type CountRow = {
  count: number;
};

function mapActionRow(row: ActionRow): Action {
  return {
    ...row,
    list: row.list as ActionList | null,
    isDone: row.isDone === 1,
    reminderType: row.reminderType as ReminderType,
  };
}

function resolveListClause(
  list: string | null,
): {
  clause: string;
  params: [string] | [];
} {
  if (list === null) {
    return {
      clause: 'list IS NULL',
      params: [],
    };
  }

  return {
    clause: 'list = ?',
    params: [list],
  };
}

export async function getAllActive(): Promise<Action[]> {
  const db = getDatabase();
  const rows = await db.getAllAsync<ActionRow>(
    'SELECT * FROM actions WHERE isDone = 0 ORDER BY sortIndex ASC',
  );
  return rows.map(mapActionRow);
}

export async function getActiveByList(list: string): Promise<Action[]> {
  const db = getDatabase();
  const rows = await db.getAllAsync<ActionRow>(
    'SELECT * FROM actions WHERE isDone = 0 AND list = ? ORDER BY sortIndex ASC',
    list,
  );
  return rows.map(mapActionRow);
}

export async function getById(id: number): Promise<Action | null> {
  const db = getDatabase();
  const row = await db.getFirstAsync<ActionRow>(
    'SELECT * FROM actions WHERE id = ?',
    id,
  );

  if (!row) {
    return null;
  }

  return mapActionRow(row);
}

export async function getActiveCountByList(list: string): Promise<number> {
  const db = getDatabase();
  const row = await db.getFirstAsync<CountRow>(
    'SELECT COUNT(*) AS count FROM actions WHERE isDone = 0 AND list = ?',
    list,
  );
  return row?.count ?? 0;
}

export async function getMinSortIndex(list: string | null): Promise<number | null> {
  const db = getDatabase();
  const { clause, params } = resolveListClause(list);
  const sql = `SELECT MIN(sortIndex) AS value FROM actions WHERE isDone = 0 AND ${clause}`;
  const row = await db.getFirstAsync<SortIndexAggregate>(sql, ...params);
  return row?.value ?? null;
}

export async function getMaxSortIndex(list: string | null): Promise<number | null> {
  const db = getDatabase();
  const { clause, params } = resolveListClause(list);
  const sql = `SELECT MAX(sortIndex) AS value FROM actions WHERE isDone = 0 AND ${clause}`;
  const row = await db.getFirstAsync<SortIndexAggregate>(sql, ...params);
  return row?.value ?? null;
}

export async function insert(action: Omit<Action, 'id'>): Promise<number> {
  const db = getDatabase();
  const result = await db.runAsync(
    `INSERT INTO actions
      (title, list, sortIndex, isDone, createdAt, updatedAt, reminderType, reminderDate, reminderTime, reminderWeekday, reminderMonthday)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    action.title,
    action.list,
    action.sortIndex,
    action.isDone ? 1 : 0,
    action.createdAt,
    action.updatedAt,
    action.reminderType,
    action.reminderDate,
    action.reminderTime,
    action.reminderWeekday,
    action.reminderMonthday,
  );

  return result.lastInsertRowId;
}

export async function update(action: Action): Promise<void> {
  const db = getDatabase();
  const updatedAt = Date.now();

  await db.runAsync(
    `UPDATE actions
      SET title = ?, list = ?, sortIndex = ?, isDone = ?, createdAt = ?, updatedAt = ?, reminderType = ?, reminderDate = ?, reminderTime = ?, reminderWeekday = ?, reminderMonthday = ?
      WHERE id = ?`,
    action.title,
    action.list,
    action.sortIndex,
    action.isDone ? 1 : 0,
    action.createdAt,
    updatedAt,
    action.reminderType,
    action.reminderDate,
    action.reminderTime,
    action.reminderWeekday,
    action.reminderMonthday,
    action.id,
  );
}

export async function markDone(id: number): Promise<void> {
  const db = getDatabase();
  await db.runAsync(
    'UPDATE actions SET isDone = 1, updatedAt = ? WHERE id = ?',
    Date.now(),
    id,
  );
}

export async function deleteById(id: number): Promise<void> {
  const db = getDatabase();
  await db.runAsync('DELETE FROM actions WHERE id = ?', id);
}

export async function updateSortIndex(id: number, sortIndex: number): Promise<void> {
  const db = getDatabase();
  await db.runAsync('UPDATE actions SET sortIndex = ? WHERE id = ?', sortIndex, id);
}

export async function getTopActiveByList(list: string, limit: number): Promise<Action[]> {
  const db = getDatabase();
  const rows = await db.getAllAsync<ActionRow>(
    'SELECT * FROM actions WHERE isDone = 0 AND list = ? ORDER BY sortIndex ASC LIMIT ?',
    list,
    limit,
  );
  return rows.map(mapActionRow);
}

export async function rebalanceSortIndexes(list: string | null): Promise<void> {
  const db = getDatabase();
  const { clause, params } = resolveListClause(list);
  const sql = `SELECT id FROM actions WHERE isDone = 0 AND ${clause} ORDER BY sortIndex ASC`;
  const rows = await db.getAllAsync<IdRow>(sql, ...params);

  if (rows.length === 0) {
    return;
  }

  await db.withTransactionAsync(async () => {
    for (let index = 0; index < rows.length; index += 1) {
      const id = rows[index].id;
      const nextSortIndex = index * SORT_GAP;
      await db.runAsync('UPDATE actions SET sortIndex = ? WHERE id = ?', nextSortIndex, id);
    }
  });
}
