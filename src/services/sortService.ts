import * as actionRepo from '@/repos/actionRepo';
import { getDatabase } from '@/db/database';

const SORT_GAP = 1000;

type SortableList = string | null;

type IdRow = {
  id: number;
};

function resolveListClause(
  list: SortableList,
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

export async function computeSortIndexForNewAction(list: SortableList): Promise<number> {
  if (list === null) {
    const minSortIndex = await actionRepo.getMinSortIndex(null);
    return minSortIndex === null ? 0 : minSortIndex - SORT_GAP;
  }

  const maxSortIndex = await actionRepo.getMaxSortIndex(list);
  return maxSortIndex === null ? 0 : maxSortIndex + SORT_GAP;
}

export async function computeSortIndexBetween(
  before: number,
  after: number,
  list?: SortableList,
): Promise<number> {
  const gap = Math.abs(after - before);

  if (gap < 2 && list !== undefined) {
    await rebalanceList(list);
  }

  return Math.floor((before + after) / 2);
}

export async function rebalanceList(list: SortableList): Promise<void> {
  const db = getDatabase();
  const { clause, params } = resolveListClause(list);
  const rows = await db.getAllAsync<IdRow>(
    `SELECT id FROM actions WHERE isDone = 0 AND ${clause} ORDER BY sortIndex ASC`,
    ...params,
  );

  if (rows.length === 0) {
    return;
  }

  await db.withTransactionAsync(async () => {
    for (let index = 0; index < rows.length; index += 1) {
      const sortIndex = index * SORT_GAP;
      await db.runAsync(
        'UPDATE actions SET sortIndex = ? WHERE id = ?',
        sortIndex,
        rows[index].id,
      );
    }
  });
}

export async function persistReorderedSortIndexes(
  actionIds: number[],
): Promise<void> {
  const db = getDatabase();

  if (actionIds.length === 0) {
    return;
  }

  await db.withTransactionAsync(async () => {
    for (let index = 0; index < actionIds.length; index += 1) {
      await db.runAsync(
        'UPDATE actions SET sortIndex = ? WHERE id = ?',
        index * SORT_GAP,
        actionIds[index],
      );
    }
  });
}
