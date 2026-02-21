import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system/legacy';
import * as actionRepo from '@/repos/actionRepo';
import { Action } from '@/types';

type ExportAction = {
  id: number;
  title: string;
  list: string | null;
  sortIndex: number;
  createdAt: number;
  updatedAt: number;
  reminderType: string;
  reminderDate: number | null;
  reminderTime: string | null;
  reminderWeekday: number | null;
  reminderMonthday: number | null;
};

const EXPORT_FIELDS: Array<keyof ExportAction> = [
  'id',
  'title',
  'list',
  'sortIndex',
  'createdAt',
  'updatedAt',
  'reminderType',
  'reminderDate',
  'reminderTime',
  'reminderWeekday',
  'reminderMonthday',
];

function mapExportAction(action: Action): ExportAction {
  return {
    id: action.id,
    title: action.title,
    list: action.list,
    sortIndex: action.sortIndex,
    createdAt: action.createdAt,
    updatedAt: action.updatedAt,
    reminderType: action.reminderType,
    reminderDate: action.reminderDate,
    reminderTime: action.reminderTime,
    reminderWeekday: action.reminderWeekday,
    reminderMonthday: action.reminderMonthday,
  };
}

function resolveExportDirectory(): string {
  const directory = FileSystem.documentDirectory;
  if (!directory) {
    throw new Error('Export directory is not available.');
  }
  return directory;
}

function csvEscape(value: unknown): string {
  if (value === null || value === undefined) {
    return '';
  }

  const raw = String(value);
  if (
    raw.includes(',')
    || raw.includes('"')
    || raw.includes('\n')
    || raw.includes('\r')
  ) {
    return `"${raw.replace(/"/g, '""')}"`;
  }

  return raw;
}

async function shareFile(uri: string): Promise<void> {
  const isSharingAvailable = await Sharing.isAvailableAsync();
  if (!isSharingAvailable) {
    throw new Error('Sharing is not available on this device.');
  }

  await Sharing.shareAsync(uri);
}

export async function exportCSV(): Promise<void> {
  const actions = (await actionRepo.getAllActive()).map(mapExportAction);
  const header = EXPORT_FIELDS.join(',');
  const rows = actions.map((action) =>
    EXPORT_FIELDS
      .map((field) => csvEscape(action[field]))
      .join(','));

  const csv = [header, ...rows].join('\n');
  const fileUri = `${resolveExportDirectory()}actions_export.csv`;

  await FileSystem.writeAsStringAsync(fileUri, csv, {
    encoding: FileSystem.EncodingType.UTF8,
  });

  await shareFile(fileUri);
}

export async function exportJSON(): Promise<void> {
  const actions = (await actionRepo.getAllActive()).map(mapExportAction);
  const json = JSON.stringify(actions, null, 2);
  const fileUri = `${resolveExportDirectory()}actions_export.json`;

  await FileSystem.writeAsStringAsync(fileUri, json, {
    encoding: FileSystem.EncodingType.UTF8,
  });

  await shareFile(fileUri);
}
