import { sql } from 'drizzle-orm';
import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';

export const settings = sqliteTable('settings', {
  id: integer('id').primaryKey(), // singleton row, id = 1
  startingSavingsMinor: integer('starting_savings_minor').notNull().default(0),
  startMonth: text('start_month').notNull(), // 'YYYY-MM-01'
  currency: text('currency').$type<'PLN' | 'USD' | 'EUR' | 'RUB'>().notNull().default('PLN'),
  horizonYears: integer('horizon_years').notNull().default(5),
});

export const flows = sqliteTable('flows', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  kind: text('kind').$type<'income' | 'spending'>().notNull(),
  name: text('name').notNull(),
  color: text('color').notNull(),
  position: integer('position').notNull().default(0),
  createdAt: text('created_at').default(sql`current_timestamp`).notNull(),
});

export const flowPeriods = sqliteTable('flow_periods', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  flowId: integer('flow_id')
    .notNull()
    .references(() => flows.id, { onDelete: 'cascade' }),
  amountMinor: integer('amount_minor').notNull().default(0),
  startMonth: text('start_month').notNull(), // 'YYYY-MM-01'
  endMonth: text('end_month'), // null = endless
});

export const taxes = sqliteTable('taxes', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  mode: text('mode').$type<'percent' | 'fixed'>().notNull(),
  rateBps: integer('rate_bps'), // percent mode: 1200 = 12.00%
  amountMinor: integer('amount_minor'), // fixed mode: minor units / month
  color: text('color').notNull(),
  position: integer('position').notNull().default(0),
  createdAt: text('created_at').default(sql`current_timestamp`).notNull(),
});

export const events = sqliteTable('events', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  month: text('month').notNull(), // 'YYYY-MM-01'
  amountMinor: integer('amount_minor').notNull().default(0),
  color: text('color'),
  createdAt: text('created_at').default(sql`current_timestamp`).notNull(),
});

export type Settings = typeof settings.$inferSelect;
export type Flow = typeof flows.$inferSelect;
export type FlowPeriod = typeof flowPeriods.$inferSelect;
export type Tax = typeof taxes.$inferSelect;
export type EventRow = typeof events.$inferSelect;
