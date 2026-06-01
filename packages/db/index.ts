import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import * as schema from './schema';

export const createDb = (source: string) => {
  const sqlite = new Database(source);
  sqlite.pragma('foreign_keys = ON');
  return drizzle(sqlite, { schema });
};

const source = process.env.DB_FILE ?? '../../data/budget.db';

export const db = createDb(source);
export * from './schema';
export type Db = typeof db;
