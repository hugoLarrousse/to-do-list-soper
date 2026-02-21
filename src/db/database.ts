import * as SQLite from 'expo-sqlite';
import { runMigrations } from './migrations';

const DATABASE_NAME = 'todo-app.db';

let databaseInstance: SQLite.SQLiteDatabase | null = null;
let initializationPromise: Promise<SQLite.SQLiteDatabase> | null = null;

export function getDatabase(): SQLite.SQLiteDatabase {
  if (!databaseInstance) {
    throw new Error('Database is not initialized. Call initDatabase() first.');
  }

  return databaseInstance;
}

export async function initDatabase(): Promise<SQLite.SQLiteDatabase> {
  if (databaseInstance) {
    return databaseInstance;
  }

  if (!initializationPromise) {
    initializationPromise = (async () => {
      const db = await SQLite.openDatabaseAsync(DATABASE_NAME);
      await db.execAsync('PRAGMA journal_mode = WAL;');
      await runMigrations(db);
      databaseInstance = db;
      return db;
    })();

    initializationPromise = initializationPromise.catch((error) => {
      initializationPromise = null;
      throw error;
    });
  }

  return initializationPromise;
}
