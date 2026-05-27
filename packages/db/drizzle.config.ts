import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  dialect: 'sqlite',
  schema: './schema.ts',
  out: './migrations',
  dbCredentials: {
    url: process.env.DB_FILE ?? '../../data/budget.db',
  },
});
