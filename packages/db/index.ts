import { drizzle } from 'drizzle-orm/better-sqlite3';
import * as schema from './schema';

const source = process.env.DB_FILE ?? '../../data/budget.db';

export const db = drizzle({ connection: { source }, schema });
export * from './schema';
