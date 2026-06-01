import { drizzle } from 'drizzle-orm/better-sqlite3';
import * as schema from './schema';

export const createDb = (source: string) => drizzle({ connection: { source }, schema });

const source = process.env.DB_FILE ?? '../../data/budget.db';

export const db = createDb(source);
export * from './schema';
export type Db = typeof db;
