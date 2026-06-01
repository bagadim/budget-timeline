import { fileURLToPath } from 'node:url';
import { createDb } from '@budget-timeline/db';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';

const migrationsFolder = fileURLToPath(new URL('../db/migrations', import.meta.url));

/** Fresh in-memory database with all migrations applied. */
export function makeTestDb() {
  const db = createDb(':memory:');
  migrate(db, { migrationsFolder });
  return db;
}
