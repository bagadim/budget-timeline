# Main Screen (Budget Timeline) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the main screen — a two-panel budget timeline chart (monthly income composition + cumulative savings) driven by a collapsible setup sidebar, replacing the scaffold `milestones` feature.

**Architecture:** Thin server, smart client. `packages/core` exposes service-first oRPC CRUD over `packages/db` (Drizzle + SQLite). The projection math is a pure, unit-tested function in `packages/shared`. A Next.js server component seeds a snapshot into a client `<BudgetScreen>` that holds state, recomputes the projection locally on every edit, and renders a hand-built SVG chart — instant feedback, no round-trip per keystroke.

**Tech Stack:** Next.js 15 (app router) + Tailwind v4 + Radix, Fastify 5 + oRPC, Drizzle ORM + better-sqlite3, Zod, vitest. Plain JS for pure utilities in `packages/shared`.

**Design spec:** `docs/superpowers/specs/2026-06-01-main-screen-design.md`

---

## File structure (created / modified)

**`packages/db`**
- Modify `schema.ts` — replace `milestones` with `settings`, `flows`, `flow_periods`, `taxes`, `events`.
- Modify `index.ts` — add `createDb(source)` factory; keep default `db`.
- Create `migrations/<generated>.sql` — via `pnpm db:generate`.

**`packages/shared`**
- Modify `money.js` — add `displayMoney(minor, currency)` with a currency→locale map.
- Modify `money.test.js` — tests for `displayMoney`.
- Modify `package.json` — export `./projection`.
- Create `projection.js` — pure projection engine.
- Create `projection.d.ts` — types for TS consumers.
- Create `projection.test.js` — projection unit tests.

**`packages/core`**
- Create `types.ts` — shared snapshot/entity types.
- Create `services/settings.ts`, `services/flows.ts`, `services/taxes.ts`, `services/events.ts`, `services/snapshot.ts`.
- Modify `router.ts` — wire procedures to services.
- Create `vitest.config.ts`, `test-helpers.ts`, and `services/*.test.ts`.
- Modify `package.json` — add `test` script + vitest dev dep + `@budget-timeline/shared` dep.

**`apps/web`**
- Create `lib/palette.ts` — palette, currency list, default colors.
- Create `app/_components/use-budget.ts` — client state hook (optimistic edits + recompute).
- Create `app/_components/budget-screen.tsx` — main client component + layout.
- Create `app/_components/sidebar/{add-link,color-swatch,setup-section,income-section,taxes-section,spendings-section,period-rows,events-section}.tsx`.
- Create `app/_components/chart/{timeline-chart,income-bars-panel,savings-panel,chart-grid}.tsx`.
- Modify `app/page.tsx` — server component fetching the snapshot.
- Delete `app/new-milestone-form.tsx`.

---

## Task 1: Multi-currency money display helper

**Files:**
- Modify: `packages/shared/money.js`
- Test: `packages/shared/money.test.js`

- [ ] **Step 1: Write the failing test**

Add to `packages/shared/money.test.js`:

```js
import { describe, expect, it } from 'vitest';
import { centsToDisplay, displayMoney } from './money.js';

describe('displayMoney', () => {
  it('defaults to PLN (pl-PL)', () => {
    // pl-PL uses non-breaking space groups and "zł" suffix
    expect(displayMoney(123456, 'PLN')).toBe('1234,56\xA0zł');
  });

  it('formats USD', () => {
    expect(displayMoney(9999, 'USD')).toBe('$99.99');
  });

  it('formats EUR (de-DE)', () => {
    expect(displayMoney(100000, 'EUR')).toBe('1.000,00\xA0€');
  });

  it('formats RUB (ru-RU)', () => {
    expect(displayMoney(50000, 'RUB')).toBe('500,00\xA0₽');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @budget-timeline/shared test`
Expected: FAIL — `displayMoney is not a function`.

- [ ] **Step 3: Implement**

Append to `packages/shared/money.js`:

```js
const CURRENCY_LOCALES = {
  PLN: 'pl-PL',
  USD: 'en-US',
  EUR: 'de-DE',
  RUB: 'ru-RU',
};

export const displayMoney = (minor, currency = 'PLN') =>
  new Intl.NumberFormat(CURRENCY_LOCALES[currency] ?? 'pl-PL', {
    style: 'currency',
    currency,
  }).format(minor / 100);
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter @budget-timeline/shared test`
Expected: PASS. If a locale string differs in your ICU build, adjust the expected literals to match the actual `Intl` output (copy from the failure message) — the behavior, not the exact glyph, is what matters.

- [ ] **Step 5: Commit**

```bash
git add packages/shared/money.js packages/shared/money.test.js
git commit -m "feat(shared): multi-currency displayMoney helper"
```

---

## Task 2: Database schema + createDb factory + migration

**Files:**
- Modify: `packages/db/schema.ts`
- Modify: `packages/db/index.ts`
- Create: `packages/db/migrations/<generated>.sql` (via CLI)

- [ ] **Step 1: Replace the schema**

Overwrite `packages/db/schema.ts`:

```ts
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
```

- [ ] **Step 2: Add the createDb factory**

Overwrite `packages/db/index.ts`:

```ts
import { drizzle } from 'drizzle-orm/better-sqlite3';
import * as schema from './schema';

export const createDb = (source: string) => drizzle({ connection: { source }, schema });

const source = process.env.DB_FILE ?? '../../data/budget.db';

export const db = createDb(source);
export * from './schema';
export type Db = typeof db;
```

- [ ] **Step 3: Generate and apply the migration**

Run:
```bash
pnpm db:generate
pnpm db:migrate
```
Expected: a new file appears under `packages/db/migrations/` containing `DROP TABLE` for `milestones` and `CREATE TABLE` for the five new tables. `db:migrate` reports it applied successfully against `data/budget.db`.

- [ ] **Step 4: Verify the schema**

Run: `pnpm --filter @budget-timeline/db exec drizzle-kit studio` is optional. Instead verify quickly:
```bash
node -e "const {createDb}=require('@budget-timeline/db'); " 2>/dev/null; echo "schema compiles via tsc next"
pnpm --filter @budget-timeline/db exec tsc --noEmit -p tsconfig.json
```
Expected: type-check passes (no errors).

- [ ] **Step 5: Commit**

```bash
git add packages/db/schema.ts packages/db/index.ts packages/db/migrations
git commit -m "feat(db): budget schema (settings, flows, periods, taxes, events) + createDb"
```

---

## Task 3: Projection engine (pure function)

**Files:**
- Create: `packages/shared/projection.js`
- Create: `packages/shared/projection.d.ts`
- Create: `packages/shared/projection.test.js`
- Modify: `packages/shared/package.json`

- [ ] **Step 1: Export the new module**

In `packages/shared/package.json`, change `exports` to:

```json
  "exports": {
    "./money": "./money.js",
    "./projection": { "types": "./projection.d.ts", "default": "./projection.js" }
  },
```

- [ ] **Step 2: Write the failing tests**

Create `packages/shared/projection.test.js`:

```js
import { describe, expect, it } from 'vitest';
import { computeProjection } from './projection.js';

const base = {
  settings: { startingSavingsMinor: 1_500_000, startMonth: '2026-01-01', currency: 'PLN', horizonYears: 5 },
  flows: [],
  taxes: [],
  events: [],
};

const incomeFlow = (overrides = {}) => ({
  id: 1, kind: 'income', name: 'Salary', color: '#000', position: 0,
  periods: [{ id: 1, flowId: 1, amountMinor: 800_000, startMonth: '2026-01-01', endMonth: null }],
  ...overrides,
});

describe('computeProjection', () => {
  it('produces horizonYears * 12 months from startMonth', () => {
    const { months } = computeProjection(base);
    expect(months).toHaveLength(60);
    expect(months[0]).toMatchObject({ monthIndex: 0, label: 'Jan', year: 2026, isYearStart: true });
    expect(months[1]).toMatchObject({ label: 'Feb', year: 2026, isYearStart: false });
    expect(months[12]).toMatchObject({ label: 'Jan', year: 2027, isYearStart: true });
  });

  it('honors a 10-year horizon', () => {
    expect(computeProjection({ ...base, settings: { ...base.settings, horizonYears: 10 } }).months).toHaveLength(120);
  });

  it('sums multiple active income flows', () => {
    const flows = [
      incomeFlow(),
      incomeFlow({ id: 2, name: 'Freelance', periods: [{ id: 2, flowId: 2, amountMinor: 200_000, startMonth: '2026-01-01', endMonth: null }] }),
    ];
    expect(computeProjection({ ...base, flows }).months[0].income).toBe(1_000_000);
  });

  it('activates a period only within its [start, end] window', () => {
    const flows = [incomeFlow({ periods: [{ id: 1, flowId: 1, amountMinor: 800_000, startMonth: '2026-03-01', endMonth: '2026-04-01' }] })];
    const { months } = computeProjection({ ...base, flows });
    expect(months[1].income).toBe(0);       // Feb
    expect(months[2].income).toBe(800_000);  // Mar
    expect(months[3].income).toBe(800_000);  // Apr
    expect(months[4].income).toBe(0);        // May
  });

  it('applies percent and fixed taxes', () => {
    const flows = [incomeFlow()]; // 800_000 income
    const taxes = [
      { id: 1, name: 'Income', mode: 'percent', rateBps: 1200, amountMinor: null, color: '#f00', position: 0 },
      { id: 2, name: 'Social', mode: 'fixed', rateBps: null, amountMinor: 50_000, color: '#f80', position: 1 },
    ];
    const m = computeProjection({ ...base, flows, taxes }).months[0];
    expect(m.taxBreakdown).toEqual([
      { id: 1, name: 'Income', color: '#f00', amount: 96_000 }, // 12% of 800_000
      { id: 2, name: 'Social', color: '#f80', amount: 50_000 },
    ]);
  });

  it('computes leftover and a running cumulative', () => {
    const flows = [incomeFlow()]; // 800_000/mo
    const spend = { id: 9, kind: 'spending', name: 'Rent', color: '#00f', position: 0,
      periods: [{ id: 9, flowId: 9, amountMinor: 300_000, startMonth: '2026-01-01', endMonth: null }] };
    const { months } = computeProjection({ ...base, flows: [...flows, spend] });
    expect(months[0].leftover).toBe(500_000);
    expect(months[0].cumulative).toBe(1_500_000 + 500_000);
    expect(months[1].cumulative).toBe(1_500_000 + 1_000_000);
  });

  it('subtracts events as one-time withdrawals at their month', () => {
    const flows = [incomeFlow()];
    const events = [{ id: 1, name: 'Japan', month: '2026-02-01', amountMinor: 1_200_000, color: null }];
    const { months } = computeProjection({ ...base, flows, events });
    expect(months[0].cumulative).toBe(2_300_000);                 // 1.5M + 0.8M
    expect(months[1].events).toEqual([{ id: 1, name: 'Japan', color: null, amount: 1_200_000 }]);
    expect(months[1].cumulative).toBe(2_300_000 + 800_000 - 1_200_000); // 1.9M
  });

  it('allows negative leftover on overspend without below-zero bar data', () => {
    const spend = { id: 9, kind: 'spending', name: 'Big', color: '#00f', position: 0,
      periods: [{ id: 9, flowId: 9, amountMinor: 1_000_000, startMonth: '2026-01-01', endMonth: null }] };
    const m = computeProjection({ ...base, flows: [incomeFlow(), spend] }).months[0];
    expect(m.leftover).toBe(-200_000); // 800k income - 1M spend
  });
});
```

- [ ] **Step 3: Run tests to verify they fail**

Run: `pnpm --filter @budget-timeline/shared test`
Expected: FAIL — `computeProjection is not a function`.

- [ ] **Step 4: Implement the engine**

Create `packages/shared/projection.js`:

```js
const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const pad2 = (n) => String(n).padStart(2, '0');
const monthKey = (year, month1to12) => `${year}-${pad2(month1to12)}-01`;

// period active in month key `m` (all keys share the 'YYYY-MM-01' format → string compare is safe)
const isActive = (period, m) =>
  period.startMonth <= m && (period.endMonth == null || m <= period.endMonth);

const amountOf = (flow, m) => {
  const p = flow.periods.find((x) => isActive(x, m));
  return p ? p.amountMinor : 0;
};

export function computeProjection({ settings, flows, taxes, events }) {
  const startYear = Number(settings.startMonth.slice(0, 4));
  const startMonth0 = Number(settings.startMonth.slice(5, 7)) - 1; // 0-based
  const total = settings.horizonYears * 12;

  const incomeFlows = flows.filter((f) => f.kind === 'income');
  const spendFlows = flows.filter((f) => f.kind === 'spending');
  const sortByPos = (a, b) => a.position - b.position || a.id - b.id;
  const sortedTaxes = [...taxes].sort(sortByPos);
  const sortedSpend = [...spendFlows].sort(sortByPos);

  const months = [];
  let cumulative = settings.startingSavingsMinor;

  for (let i = 0; i < total; i++) {
    const year = startYear + Math.floor((startMonth0 + i) / 12);
    const month1 = ((startMonth0 + i) % 12) + 1;
    const m = monthKey(year, month1);

    const income = incomeFlows.reduce((sum, f) => sum + amountOf(f, m), 0);

    const taxBreakdown = sortedTaxes.map((t) => ({
      id: t.id,
      name: t.name,
      color: t.color,
      amount: t.mode === 'percent' ? Math.round((income * (t.rateBps ?? 0)) / 10000) : (t.amountMinor ?? 0),
    }));
    const totalTax = taxBreakdown.reduce((s, t) => s + t.amount, 0);

    const spendBreakdown = sortedSpend.map((f) => ({
      id: f.id,
      name: f.name,
      color: f.color,
      amount: amountOf(f, m),
    }));
    const totalSpend = spendBreakdown.reduce((s, x) => s + x.amount, 0);

    const monthEvents = events
      .filter((e) => e.month === m)
      .map((e) => ({ id: e.id, name: e.name, color: e.color, amount: e.amountMinor }));
    const totalEvents = monthEvents.reduce((s, e) => s + e.amount, 0);

    const leftover = income - totalTax - totalSpend;
    cumulative = cumulative + leftover - totalEvents;

    months.push({
      monthIndex: i,
      label: MONTH_LABELS[month1 - 1],
      year,
      isYearStart: month1 === 1 || i === 0,
      income,
      taxBreakdown,
      spendBreakdown,
      leftover,
      cumulative,
      events: monthEvents,
    });
  }

  return { months };
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `pnpm --filter @budget-timeline/shared test`
Expected: PASS (all `computeProjection` + `displayMoney` + `centsToDisplay` tests green).

- [ ] **Step 6: Add types for TS consumers**

Create `packages/shared/projection.d.ts`:

```ts
export interface ProjectionPeriod {
  id: number;
  flowId: number;
  amountMinor: number;
  startMonth: string;
  endMonth: string | null;
}
export interface ProjectionFlow {
  id: number;
  kind: 'income' | 'spending';
  name: string;
  color: string;
  position: number;
  periods: ProjectionPeriod[];
}
export interface ProjectionTax {
  id: number;
  name: string;
  mode: 'percent' | 'fixed';
  rateBps: number | null;
  amountMinor: number | null;
  color: string;
  position: number;
}
export interface ProjectionEvent {
  id: number;
  name: string;
  month: string;
  amountMinor: number;
  color: string | null;
}
export interface ProjectionSettings {
  startingSavingsMinor: number;
  startMonth: string;
  currency: string;
  horizonYears: number;
}
export interface ProjectionInput {
  settings: ProjectionSettings;
  flows: ProjectionFlow[];
  taxes: ProjectionTax[];
  events: ProjectionEvent[];
}
export interface MonthBreakdownItem { id: number; name: string; color: string | null; amount: number; }
export interface ProjectionMonth {
  monthIndex: number;
  label: string;
  year: number;
  isYearStart: boolean;
  income: number;
  taxBreakdown: MonthBreakdownItem[];
  spendBreakdown: MonthBreakdownItem[];
  leftover: number;
  cumulative: number;
  events: MonthBreakdownItem[];
}
export interface Projection { months: ProjectionMonth[]; }
export function computeProjection(input: ProjectionInput): Projection;
```

- [ ] **Step 7: Commit**

```bash
git add packages/shared/projection.js packages/shared/projection.d.ts packages/shared/projection.test.js packages/shared/package.json
git commit -m "feat(shared): pure budget projection engine"
```

---

## Task 4: Core test harness + shared types

**Files:**
- Create: `packages/core/types.ts`
- Create: `packages/core/vitest.config.ts`
- Create: `packages/core/test-helpers.ts`
- Modify: `packages/core/package.json`

- [ ] **Step 1: Add core types**

Create `packages/core/types.ts`:

```ts
import type { EventRow, Flow, FlowPeriod, Settings, Tax } from '@budget-timeline/db';

export type FlowWithPeriods = Flow & { periods: FlowPeriod[] };

export interface Snapshot {
  settings: Settings;
  flows: FlowWithPeriods[];
  taxes: Tax[];
  events: EventRow[];
}
```

- [ ] **Step 2: Add vitest config + deps**

Create `packages/core/vitest.config.ts`:

```ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: { environment: 'node', include: ['**/*.test.ts'] },
});
```

In `packages/core/package.json`, add the `test` script, the shared dep, and vitest:

```json
  "scripts": {
    "test": "vitest run"
  },
  "dependencies": {
    "@budget-timeline/db": "workspace:*",
    "@budget-timeline/shared": "workspace:*",
    "@orpc/server": "latest",
    "drizzle-orm": "^0.36.0",
    "zod": "^3.23.0"
  },
  "devDependencies": {
    "drizzle-kit": "^0.30.0",
    "vitest": "^2.0.0"
  }
```

Then run: `pnpm install`
Expected: installs vitest into `@budget-timeline/core`.

- [ ] **Step 3: Add the in-memory DB test helper**

Create `packages/core/test-helpers.ts`:

```ts
import { fileURLToPath } from 'node:url';
import { createDb } from '@budget-timeline/db';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';

const migrationsFolder = fileURLToPath(new URL('../db/migrations', import.meta.url));

/** Fresh in-memory database with all migrations applied + a seeded settings row. */
export function makeTestDb() {
  const db = createDb(':memory:');
  migrate(db, { migrationsFolder });
  return db;
}
```

- [ ] **Step 4: Smoke-test the harness**

Create `packages/core/test-helpers.test.ts`:

```ts
import { settings } from '@budget-timeline/db';
import { describe, expect, it } from 'vitest';
import { makeTestDb } from './test-helpers';

describe('makeTestDb', () => {
  it('creates an empty migrated database', () => {
    const db = makeTestDb();
    expect(db.select().from(settings).all()).toEqual([]);
  });
});
```

Run: `pnpm --filter @budget-timeline/core test`
Expected: PASS (migrations apply to `:memory:`, `settings` table exists and is empty). If `migrationsFolder` cannot be found, confirm the relative path `../db/migrations` resolves from `packages/core/`.

- [ ] **Step 5: Commit**

```bash
git add packages/core/types.ts packages/core/vitest.config.ts packages/core/test-helpers.ts packages/core/test-helpers.test.ts packages/core/package.json
git commit -m "test(core): in-memory db harness + snapshot types"
```

---

## Task 5: Settings + snapshot service

**Files:**
- Create: `packages/core/services/settings.ts`
- Create: `packages/core/services/snapshot.ts`
- Create: `packages/core/services/settings.test.ts`

- [ ] **Step 1: Write the failing test**

Create `packages/core/services/settings.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { makeTestDb } from '../test-helpers';
import { getSettings, updateSettings } from './settings';

describe('settings service', () => {
  it('returns a seeded default singleton on first read', () => {
    const db = makeTestDb();
    const s = getSettings(db);
    expect(s).toMatchObject({ id: 1, currency: 'PLN', horizonYears: 5, startingSavingsMinor: 0 });
    expect(s.startMonth).toMatch(/^\d{4}-\d{2}-01$/);
  });

  it('updates and persists fields', () => {
    const db = makeTestDb();
    getSettings(db); // seed
    const updated = updateSettings(db, { currency: 'EUR', horizonYears: 10, startingSavingsMinor: 999 });
    expect(updated).toMatchObject({ currency: 'EUR', horizonYears: 10, startingSavingsMinor: 999 });
    expect(getSettings(db).currency).toBe('EUR');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @budget-timeline/core test settings`
Expected: FAIL — cannot find `./settings`.

- [ ] **Step 3: Implement the settings service**

Create `packages/core/services/settings.ts`:

```ts
import { type Db, type Settings, settings } from '@budget-timeline/db';
import { eq } from 'drizzle-orm';

const defaultStartMonth = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
};

export function getSettings(db: Db): Settings {
  const existing = db.select().from(settings).where(eq(settings.id, 1)).get();
  if (existing) return existing;
  return db
    .insert(settings)
    .values({ id: 1, startingSavingsMinor: 0, startMonth: defaultStartMonth(), currency: 'PLN', horizonYears: 5 })
    .returning()
    .get();
}

export function updateSettings(
  db: Db,
  patch: Partial<Pick<Settings, 'startingSavingsMinor' | 'startMonth' | 'currency' | 'horizonYears'>>,
): Settings {
  getSettings(db); // ensure the row exists
  return db.update(settings).set(patch).where(eq(settings.id, 1)).returning().get();
}
```

- [ ] **Step 4: Implement the snapshot service**

Create `packages/core/services/snapshot.ts`:

```ts
import type { Db } from '@budget-timeline/db';
import type { Snapshot } from '../types';
import { listEvents } from './events';
import { listFlows } from './flows';
import { getSettings } from './settings';
import { listTaxes } from './taxes';

export function getSnapshot(db: Db): Snapshot {
  return {
    settings: getSettings(db),
    flows: listFlows(db),
    taxes: listTaxes(db),
    events: listEvents(db),
  };
}
```

> Note: `getSnapshot` imports `listFlows`, `listTaxes`, `listEvents` — created in Tasks 6–8. It will not type-check until those exist; that is expected. The settings test below does not import snapshot, so it passes now.

- [ ] **Step 5: Run the settings test**

Run: `pnpm --filter @budget-timeline/core test settings`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add packages/core/services/settings.ts packages/core/services/snapshot.ts packages/core/services/settings.test.ts
git commit -m "feat(core): settings + snapshot services"
```

---

## Task 6: Flows + periods service

**Files:**
- Create: `packages/core/services/flows.ts`
- Create: `packages/core/services/flows.test.ts`

- [ ] **Step 1: Write the failing test**

Create `packages/core/services/flows.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { makeTestDb } from '../test-helpers';
import { addPeriod, createFlow, deleteFlow, listFlows, updateFlow, updatePeriod } from './flows';

describe('flows service', () => {
  it('creates a flow with one default period', () => {
    const db = makeTestDb();
    const flow = createFlow(db, { kind: 'income', name: 'Salary', color: '#2563eb', position: 0, startMonth: '2026-01-01' });
    expect(flow).toMatchObject({ kind: 'income', name: 'Salary', color: '#2563eb' });
    expect(flow.periods).toHaveLength(1);
    expect(flow.periods[0]).toMatchObject({ amountMinor: 0, startMonth: '2026-01-01', endMonth: null });
  });

  it('lists flows with their periods', () => {
    const db = makeTestDb();
    createFlow(db, { kind: 'spending', name: 'Rent', color: '#00f', position: 0, startMonth: '2026-01-01' });
    const flows = listFlows(db);
    expect(flows).toHaveLength(1);
    expect(flows[0].periods).toHaveLength(1);
  });

  it('updates a flow and a period', () => {
    const db = makeTestDb();
    const flow = createFlow(db, { kind: 'spending', name: 'Rent', color: '#00f', position: 0, startMonth: '2026-01-01' });
    updateFlow(db, { id: flow.id, name: 'Apartment', color: '#111' });
    updatePeriod(db, { id: flow.periods[0].id, amountMinor: 200_000, endMonth: '2026-12-01' });
    const reloaded = listFlows(db)[0];
    expect(reloaded.name).toBe('Apartment');
    expect(reloaded.periods[0]).toMatchObject({ amountMinor: 200_000, endMonth: '2026-12-01' });
  });

  it('adds a period and closes the previous open one the month before', () => {
    const db = makeTestDb();
    const flow = createFlow(db, { kind: 'spending', name: 'Rent', color: '#00f', position: 0, startMonth: '2026-01-01' });
    addPeriod(db, { flowId: flow.id, amountMinor: 230_000, startMonth: '2028-01-01' });
    const periods = listFlows(db)[0].periods;
    expect(periods).toHaveLength(2);
    expect(periods[0].endMonth).toBe('2027-12-01'); // auto-closed
    expect(periods[1]).toMatchObject({ amountMinor: 230_000, startMonth: '2028-01-01', endMonth: null });
  });

  it('deletes a flow and cascades its periods', () => {
    const db = makeTestDb();
    const flow = createFlow(db, { kind: 'income', name: 'X', color: '#000', position: 0, startMonth: '2026-01-01' });
    deleteFlow(db, flow.id);
    expect(listFlows(db)).toHaveLength(0);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @budget-timeline/core test flows`
Expected: FAIL — cannot find `./flows`.

- [ ] **Step 3: Implement the flows service**

Create `packages/core/services/flows.ts`:

```ts
import { type Db, flowPeriods, flows } from '@budget-timeline/db';
import { asc, eq } from 'drizzle-orm';
import type { FlowWithPeriods } from '../types';

// previous-month key for 'YYYY-MM-01'
const prevMonth = (m: string): string => {
  const y = Number(m.slice(0, 4));
  const mo = Number(m.slice(5, 7));
  const py = mo === 1 ? y - 1 : y;
  const pm = mo === 1 ? 12 : mo - 1;
  return `${py}-${String(pm).padStart(2, '0')}-01`;
};

export function listFlows(db: Db): FlowWithPeriods[] {
  const allFlows = db.select().from(flows).orderBy(asc(flows.position), asc(flows.id)).all();
  const allPeriods = db.select().from(flowPeriods).orderBy(asc(flowPeriods.startMonth)).all();
  return allFlows.map((f) => ({ ...f, periods: allPeriods.filter((p) => p.flowId === f.id) }));
}

export function createFlow(
  db: Db,
  input: { kind: 'income' | 'spending'; name: string; color: string; position: number; startMonth: string },
): FlowWithPeriods {
  const flow = db
    .insert(flows)
    .values({ kind: input.kind, name: input.name, color: input.color, position: input.position })
    .returning()
    .get();
  db.insert(flowPeriods).values({ flowId: flow.id, amountMinor: 0, startMonth: input.startMonth, endMonth: null }).run();
  return listFlows(db).find((f) => f.id === flow.id) as FlowWithPeriods;
}

export function updateFlow(
  db: Db,
  patch: { id: number; name?: string; color?: string; position?: number },
): void {
  const { id, ...rest } = patch;
  db.update(flows).set(rest).where(eq(flows.id, id)).run();
}

export function deleteFlow(db: Db, id: number): void {
  db.delete(flows).where(eq(flows.id, id)).run();
}

export function addPeriod(
  db: Db,
  input: { flowId: number; amountMinor: number; startMonth: string; endMonth?: string | null },
): void {
  // auto-close any open (endMonth null) period that starts before this one
  const open = db
    .select()
    .from(flowPeriods)
    .where(eq(flowPeriods.flowId, input.flowId))
    .all()
    .filter((p) => p.endMonth == null && p.startMonth < input.startMonth);
  for (const p of open) {
    db.update(flowPeriods).set({ endMonth: prevMonth(input.startMonth) }).where(eq(flowPeriods.id, p.id)).run();
  }
  db.insert(flowPeriods)
    .values({ flowId: input.flowId, amountMinor: input.amountMinor, startMonth: input.startMonth, endMonth: input.endMonth ?? null })
    .run();
}

export function updatePeriod(
  db: Db,
  patch: { id: number; amountMinor?: number; startMonth?: string; endMonth?: string | null },
): void {
  const { id, ...rest } = patch;
  db.update(flowPeriods).set(rest).where(eq(flowPeriods.id, id)).run();
}

export function deletePeriod(db: Db, id: number): void {
  db.delete(flowPeriods).where(eq(flowPeriods.id, id)).run();
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter @budget-timeline/core test flows`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/core/services/flows.ts packages/core/services/flows.test.ts
git commit -m "feat(core): flows + periods service"
```

---

## Task 7: Taxes service

**Files:**
- Create: `packages/core/services/taxes.ts`
- Create: `packages/core/services/taxes.test.ts`

- [ ] **Step 1: Write the failing test**

Create `packages/core/services/taxes.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { makeTestDb } from '../test-helpers';
import { createTax, deleteTax, listTaxes, updateTax } from './taxes';

describe('taxes service', () => {
  it('creates, lists, updates, and deletes taxes', () => {
    const db = makeTestDb();
    const tax = createTax(db, { name: 'Income', mode: 'percent', rateBps: 1200, amountMinor: null, color: '#ef4444', position: 0 });
    expect(tax).toMatchObject({ name: 'Income', mode: 'percent', rateBps: 1200 });

    expect(listTaxes(db)).toHaveLength(1);

    updateTax(db, { id: tax.id, mode: 'fixed', rateBps: null, amountMinor: 50_000 });
    expect(listTaxes(db)[0]).toMatchObject({ mode: 'fixed', amountMinor: 50_000 });

    deleteTax(db, tax.id);
    expect(listTaxes(db)).toHaveLength(0);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @budget-timeline/core test taxes`
Expected: FAIL — cannot find `./taxes`.

- [ ] **Step 3: Implement the taxes service**

Create `packages/core/services/taxes.ts`:

```ts
import { type Db, type Tax, taxes } from '@budget-timeline/db';
import { asc, eq } from 'drizzle-orm';

export function listTaxes(db: Db): Tax[] {
  return db.select().from(taxes).orderBy(asc(taxes.position), asc(taxes.id)).all();
}

export function createTax(
  db: Db,
  input: { name: string; mode: 'percent' | 'fixed'; rateBps: number | null; amountMinor: number | null; color: string; position: number },
): Tax {
  return db.insert(taxes).values(input).returning().get();
}

export function updateTax(
  db: Db,
  patch: { id: number; name?: string; mode?: 'percent' | 'fixed'; rateBps?: number | null; amountMinor?: number | null; color?: string; position?: number },
): void {
  const { id, ...rest } = patch;
  db.update(taxes).set(rest).where(eq(taxes.id, id)).run();
}

export function deleteTax(db: Db, id: number): void {
  db.delete(taxes).where(eq(taxes.id, id)).run();
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter @budget-timeline/core test taxes`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/core/services/taxes.ts packages/core/services/taxes.test.ts
git commit -m "feat(core): taxes service"
```

---

## Task 8: Events service

**Files:**
- Create: `packages/core/services/events.ts`
- Create: `packages/core/services/events.test.ts`

- [ ] **Step 1: Write the failing test**

Create `packages/core/services/events.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { makeTestDb } from '../test-helpers';
import { createEvent, deleteEvent, listEvents, updateEvent } from './events';

describe('events service', () => {
  it('creates, lists, updates, and deletes events', () => {
    const db = makeTestDb();
    const ev = createEvent(db, { name: 'Japan', month: '2026-10-01', amountMinor: 1_200_000, color: null });
    expect(ev).toMatchObject({ name: 'Japan', month: '2026-10-01', amountMinor: 1_200_000 });

    expect(listEvents(db)).toHaveLength(1);

    updateEvent(db, { id: ev.id, amountMinor: 1_500_000, color: '#ec4899' });
    expect(listEvents(db)[0]).toMatchObject({ amountMinor: 1_500_000, color: '#ec4899' });

    deleteEvent(db, ev.id);
    expect(listEvents(db)).toHaveLength(0);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @budget-timeline/core test events`
Expected: FAIL — cannot find `./events`.

- [ ] **Step 3: Implement the events service**

Create `packages/core/services/events.ts`:

```ts
import { type Db, type EventRow, events } from '@budget-timeline/db';
import { asc, eq } from 'drizzle-orm';

export function listEvents(db: Db): EventRow[] {
  return db.select().from(events).orderBy(asc(events.month), asc(events.id)).all();
}

export function createEvent(
  db: Db,
  input: { name: string; month: string; amountMinor: number; color: string | null },
): EventRow {
  return db.insert(events).values(input).returning().get();
}

export function updateEvent(
  db: Db,
  patch: { id: number; name?: string; month?: string; amountMinor?: number; color?: string | null },
): void {
  const { id, ...rest } = patch;
  db.update(events).set(rest).where(eq(events.id, id)).run();
}

export function deleteEvent(db: Db, id: number): void {
  db.delete(events).where(eq(events.id, id)).run();
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter @budget-timeline/core test events`
Expected: PASS. Then run the full core suite — `pnpm --filter @budget-timeline/core test` — and confirm `snapshot.ts` now type-checks (all its imports exist).

- [ ] **Step 5: Commit**

```bash
git add packages/core/services/events.ts packages/core/services/events.test.ts
git commit -m "feat(core): events service"
```

---

## Task 9: Wire the oRPC router to services

**Files:**
- Modify: `packages/core/router.ts`

- [ ] **Step 1: Replace the router**

Overwrite `packages/core/router.ts`:

```ts
import { db } from '@budget-timeline/db';
import { os } from '@orpc/server';
import { z } from 'zod';
import * as eventsSvc from './services/events';
import * as flowsSvc from './services/flows';
import { getSnapshot } from './services/snapshot';
import { getSettings, updateSettings } from './services/settings';
import * as taxesSvc from './services/taxes';

const MONTH = z.string().regex(/^\d{4}-\d{2}-01$/);
const KIND = z.enum(['income', 'spending']);
const MODE = z.enum(['percent', 'fixed']);
const CURRENCY = z.enum(['PLN', 'USD', 'EUR', 'RUB']);
const MINOR = z.number().int().nonnegative();

// --- snapshot ---
const snapshot = os.handler(async () => getSnapshot(db));

// --- settings ---
const settingsGet = os.handler(async () => getSettings(db));
const settingsUpdate = os
  .input(
    z.object({
      startingSavingsMinor: MINOR.optional(),
      startMonth: MONTH.optional(),
      currency: CURRENCY.optional(),
      horizonYears: z.union([z.literal(5), z.literal(10)]).optional(),
    }),
  )
  .handler(async ({ input }) => updateSettings(db, input));

// --- flows ---
const flowsCreate = os
  .input(z.object({ kind: KIND, name: z.string().min(1), color: z.string(), position: z.number().int(), startMonth: MONTH }))
  .handler(async ({ input }) => flowsSvc.createFlow(db, input));
const flowsUpdate = os
  .input(z.object({ id: z.number().int(), name: z.string().min(1).optional(), color: z.string().optional(), position: z.number().int().optional() }))
  .handler(async ({ input }) => {
    flowsSvc.updateFlow(db, input);
    return { ok: true };
  });
const flowsDelete = os.input(z.object({ id: z.number().int() })).handler(async ({ input }) => {
  flowsSvc.deleteFlow(db, input.id);
  return { ok: true };
});
const periodAdd = os
  .input(z.object({ flowId: z.number().int(), amountMinor: MINOR, startMonth: MONTH, endMonth: MONTH.nullable().optional() }))
  .handler(async ({ input }) => {
    flowsSvc.addPeriod(db, input);
    return { ok: true };
  });
const periodUpdate = os
  .input(z.object({ id: z.number().int(), amountMinor: MINOR.optional(), startMonth: MONTH.optional(), endMonth: MONTH.nullable().optional() }))
  .handler(async ({ input }) => {
    flowsSvc.updatePeriod(db, input);
    return { ok: true };
  });
const periodDelete = os.input(z.object({ id: z.number().int() })).handler(async ({ input }) => {
  flowsSvc.deletePeriod(db, input.id);
  return { ok: true };
});

// --- taxes ---
const taxesCreate = os
  .input(z.object({ name: z.string().min(1), mode: MODE, rateBps: z.number().int().min(0).max(10000).nullable(), amountMinor: MINOR.nullable(), color: z.string(), position: z.number().int() }))
  .handler(async ({ input }) => taxesSvc.createTax(db, input));
const taxesUpdate = os
  .input(z.object({ id: z.number().int(), name: z.string().min(1).optional(), mode: MODE.optional(), rateBps: z.number().int().min(0).max(10000).nullable().optional(), amountMinor: MINOR.nullable().optional(), color: z.string().optional(), position: z.number().int().optional() }))
  .handler(async ({ input }) => {
    taxesSvc.updateTax(db, input);
    return { ok: true };
  });
const taxesDelete = os.input(z.object({ id: z.number().int() })).handler(async ({ input }) => {
  taxesSvc.deleteTax(db, input.id);
  return { ok: true };
});

// --- events ---
const eventsCreate = os
  .input(z.object({ name: z.string().min(1), month: MONTH, amountMinor: MINOR, color: z.string().nullable() }))
  .handler(async ({ input }) => eventsSvc.createEvent(db, input));
const eventsUpdate = os
  .input(z.object({ id: z.number().int(), name: z.string().min(1).optional(), month: MONTH.optional(), amountMinor: MINOR.optional(), color: z.string().nullable().optional() }))
  .handler(async ({ input }) => {
    eventsSvc.updateEvent(db, input);
    return { ok: true };
  });
const eventsDelete = os.input(z.object({ id: z.number().int() })).handler(async ({ input }) => {
  eventsSvc.deleteEvent(db, input.id);
  return { ok: true };
});

export const router = {
  snapshot,
  settings: { get: settingsGet, update: settingsUpdate },
  flows: {
    create: flowsCreate,
    update: flowsUpdate,
    delete: flowsDelete,
    periods: { add: periodAdd, update: periodUpdate, delete: periodDelete },
  },
  taxes: { create: taxesCreate, update: taxesUpdate, delete: taxesDelete },
  events: { create: eventsCreate, update: eventsUpdate, delete: eventsDelete },
};

export type Router = typeof router;
```

- [ ] **Step 2: Type-check core + run all core tests**

Run:
```bash
pnpm --filter @budget-timeline/core exec tsc --noEmit -p tsconfig.json
pnpm --filter @budget-timeline/core test
```
Expected: type-check clean; all service tests pass.

- [ ] **Step 3: Verify the API server boots**

Run (in one shell): `pnpm --filter @budget-timeline/api dev` then in another:
```bash
curl -s -X POST http://localhost:4001/rpc/snapshot -H 'content-type: application/json' -d '{}'
```
Expected: a JSON snapshot with a seeded `settings` object and empty `flows`/`taxes`/`events` arrays. Stop the server (`pnpm dev-kill`).

- [ ] **Step 4: Commit**

```bash
git add packages/core/router.ts
git commit -m "feat(core): oRPC router wired to budget services"
```

---

## Task 10: Web foundations — palette + client state hook

**Files:**
- Create: `apps/web/lib/palette.ts`
- Create: `apps/web/app/_components/use-budget.ts`

- [ ] **Step 1: Add palette + constants**

Create `apps/web/lib/palette.ts`:

```ts
export const PALETTE = [
  '#2563eb', '#14b8a6', '#f59e0b', '#8b5cf6', '#ec4899',
  '#06b6d4', '#84cc16', '#f43f5e', '#a855f7', '#64748b',
] as const;

export const TAX_PALETTE = ['#ef4444', '#fb923c'] as const;

export const SAVINGS_GREEN = '#10b981'; // reserved for leftover cap + savings line

export const CURRENCIES = ['PLN', 'USD', 'EUR', 'RUB'] as const;
export type Currency = (typeof CURRENCIES)[number];

/** Pick the next palette color by item count, cycling. */
export const nextColor = (palette: readonly string[], count: number) => palette[count % palette.length];
```

- [ ] **Step 2: Add the client state hook**

Create `apps/web/app/_components/use-budget.ts`:

```ts
'use client';

import type { Snapshot } from '@budget-timeline/core/types';
import { computeProjection } from '@budget-timeline/shared/projection';
import { useCallback, useMemo, useState } from 'react';
import { client } from '@/lib/orpc';

export function useBudget(initial: Snapshot) {
  const [snapshot, setSnapshot] = useState<Snapshot>(initial);

  const projection = useMemo(() => computeProjection(snapshot), [snapshot]);

  const reload = useCallback(async () => {
    setSnapshot(await client.snapshot());
  }, []);

  // Optimistically patch local state, then persist; on error, reload from server.
  const persist = useCallback(
    async (mutate: (s: Snapshot) => Snapshot, call: () => Promise<unknown>) => {
      setSnapshot((s) => mutate(s));
      try {
        await call();
      } catch {
        await reload();
      }
    },
    [reload],
  );

  return { snapshot, setSnapshot, projection, reload, persist, client };
}
```

> Note: `@budget-timeline/core/types` must be importable. In `packages/core/package.json`, extend `exports` to add `"./types": "./types.ts"` (alongside the existing `"."`). Make that edit now.

- [ ] **Step 3: Add the core types export**

In `packages/core/package.json`, change `exports` to:

```json
  "exports": {
    ".": "./router.ts",
    "./types": "./types.ts"
  },
```

Run: `pnpm install` (refresh workspace export resolution), then type-check web later in Task 13.

- [ ] **Step 4: Commit**

```bash
git add apps/web/lib/palette.ts apps/web/app/_components/use-budget.ts packages/core/package.json
git commit -m "feat(web): palette constants + useBudget state hook"
```

---

## Task 11: Sidebar components

**Files:**
- Create: `apps/web/app/_components/sidebar/add-link.tsx`
- Create: `apps/web/app/_components/sidebar/color-swatch.tsx`
- Create: `apps/web/app/_components/sidebar/setup-section.tsx`
- Create: `apps/web/app/_components/sidebar/income-section.tsx`
- Create: `apps/web/app/_components/sidebar/spendings-section.tsx`
- Create: `apps/web/app/_components/sidebar/period-rows.tsx`
- Create: `apps/web/app/_components/sidebar/taxes-section.tsx`
- Create: `apps/web/app/_components/sidebar/events-section.tsx`

All sections receive the `useBudget` return value via props (the parent owns it). To keep the hook signature stable, each section gets `budget: ReturnType<typeof useBudget>`.

- [ ] **Step 1: Shared `+ add` link**

Create `apps/web/app/_components/sidebar/add-link.tsx`:

```tsx
export function AddLink({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="mt-1.5 text-sm font-medium text-blue-600 hover:text-blue-700"
    >
      + {label}
    </button>
  );
}
```

- [ ] **Step 2: Color swatch popover (no extra deps)**

Create `apps/web/app/_components/sidebar/color-swatch.tsx`:

```tsx
'use client';

import { useState } from 'react';
import { PALETTE } from '@/lib/palette';

export function ColorSwatch({
  color,
  options = PALETTE,
  onChange,
}: {
  color: string;
  options?: readonly string[];
  onChange: (c: string) => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button
        type="button"
        aria-label="Change color"
        onClick={() => setOpen((o) => !o)}
        className="h-3.5 w-3.5 rounded"
        style={{ background: color }}
      />
      {open && (
        <div className="absolute z-10 mt-1 flex w-32 flex-wrap gap-1 rounded-md border border-zinc-200 bg-white p-1.5 shadow-lg">
          {options.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => {
                onChange(c);
                setOpen(false);
              }}
              className="h-4 w-4 rounded"
              style={{ background: c }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Setup section**

Create `apps/web/app/_components/sidebar/setup-section.tsx`:

```tsx
'use client';

import type { useBudget } from '../use-budget';
import { CURRENCIES } from '@/lib/palette';

export function SetupSection({ budget }: { budget: ReturnType<typeof useBudget> }) {
  const { snapshot, persist, client } = budget;
  const s = snapshot.settings;

  // horizonYears is set via the chart toggle (its Zod type is 5|10), so it's excluded here.
  const update = (patch: Partial<Pick<typeof s, 'startingSavingsMinor' | 'startMonth' | 'currency'>>) =>
    persist(
      (cur) => ({ ...cur, settings: { ...cur.settings, ...patch } }),
      () => client.settings.update(patch),
    );

  return (
    <section className="rounded-lg border border-zinc-200 bg-white p-3">
      <h2 className="mb-2 font-semibold">Setup</h2>
      <label className="mb-2 block text-xs text-zinc-500">
        Starting savings
        <input
          type="number"
          defaultValue={s.startingSavingsMinor / 100}
          onBlur={(e) => update({ startingSavingsMinor: Math.round(Number(e.target.value) * 100) })}
          className="mt-0.5 block w-full rounded border border-zinc-300 px-2 py-1 text-sm text-zinc-900"
        />
      </label>
      <div className="flex gap-2">
        <label className="block flex-1 text-xs text-zinc-500">
          Start month
          <input
            type="month"
            defaultValue={s.startMonth.slice(0, 7)}
            onBlur={(e) => e.target.value && update({ startMonth: `${e.target.value}-01` })}
            className="mt-0.5 block w-full rounded border border-zinc-300 px-2 py-1 text-sm text-zinc-900"
          />
        </label>
        <label className="block text-xs text-zinc-500">
          Currency
          <select
            value={s.currency}
            onChange={(e) => update({ currency: e.target.value as (typeof CURRENCIES)[number] })}
            className="mt-0.5 block rounded border border-zinc-300 px-2 py-1 text-sm text-zinc-900"
          >
            {CURRENCIES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </label>
      </div>
    </section>
  );
}
```

- [ ] **Step 4: Period rows (used by spendings + income)**

Create `apps/web/app/_components/sidebar/period-rows.tsx`:

```tsx
'use client';

import type { FlowWithPeriods } from '@budget-timeline/core/types';
import type { useBudget } from '../use-budget';
import { AddLink } from './add-link';

export function PeriodRows({ flow, budget }: { flow: FlowWithPeriods; budget: ReturnType<typeof useBudget> }) {
  const { snapshot, persist, client } = budget;

  const patchPeriod = (id: number, patch: { amountMinor?: number; startMonth?: string; endMonth?: string | null }) =>
    persist(
      (cur) => ({
        ...cur,
        flows: cur.flows.map((f) =>
          f.id === flow.id ? { ...f, periods: f.periods.map((p) => (p.id === id ? { ...p, ...patch } : p)) } : f,
        ),
      }),
      () => client.flows.periods.update({ id, ...patch }),
    );

  const addPeriod = () => {
    const startMonth = snapshot.settings.startMonth;
    persist(
      (cur) => cur, // server returns nothing; reload to get new period id
      async () => {
        await client.flows.periods.add({ flowId: flow.id, amountMinor: 0, startMonth });
        await budget.reload();
      },
    );
  };

  const removePeriod = (id: number) =>
    persist(
      (cur) => ({
        ...cur,
        flows: cur.flows.map((f) => (f.id === flow.id ? { ...f, periods: f.periods.filter((p) => p.id !== id) } : f)),
      }),
      () => client.flows.periods.delete({ id }),
    );

  return (
    <div className="mt-1.5 space-y-1.5 border-l-2 border-zinc-100 pl-2">
      {flow.periods.map((p) => (
        <div key={p.id} className="flex items-center gap-1.5 text-xs">
          <input
            type="number"
            defaultValue={p.amountMinor / 100}
            onBlur={(e) => patchPeriod(p.id, { amountMinor: Math.round(Number(e.target.value) * 100) })}
            className="w-16 rounded border border-zinc-300 px-1 py-0.5 text-zinc-900"
          />
          <input
            type="month"
            defaultValue={p.startMonth.slice(0, 7)}
            onBlur={(e) => e.target.value && patchPeriod(p.id, { startMonth: `${e.target.value}-01` })}
            className="rounded border border-zinc-300 px-1 py-0.5 text-zinc-900"
          />
          <span className="text-zinc-400">→</span>
          <input
            type="month"
            defaultValue={p.endMonth ? p.endMonth.slice(0, 7) : ''}
            onBlur={(e) => patchPeriod(p.id, { endMonth: e.target.value ? `${e.target.value}-01` : null })}
            className="rounded border border-zinc-300 px-1 py-0.5 text-zinc-900"
          />
          {flow.periods.length > 1 && (
            <button type="button" onClick={() => removePeriod(p.id)} className="text-zinc-400 hover:text-red-600">
              ✕
            </button>
          )}
        </div>
      ))}
      <AddLink label="add period" onClick={addPeriod} />
    </div>
  );
}
```

- [ ] **Step 5: Spendings section**

Create `apps/web/app/_components/sidebar/spendings-section.tsx`:

```tsx
'use client';

import { useState } from 'react';
import type { useBudget } from '../use-budget';
import { nextColor, PALETTE } from '@/lib/palette';
import { AddLink } from './add-link';
import { ColorSwatch } from './color-swatch';
import { PeriodRows } from './period-rows';

export function SpendingsSection({ budget }: { budget: ReturnType<typeof useBudget> }) {
  const { snapshot, persist, client, reload } = budget;
  const [expanded, setExpanded] = useState<number | null>(null);
  const spendings = snapshot.flows.filter((f) => f.kind === 'spending');

  const add = () => {
    const color = nextColor(PALETTE, snapshot.flows.length);
    persist(
      (cur) => cur,
      async () => {
        await client.flows.create({ kind: 'spending', name: 'New spending', color, position: spendings.length, startMonth: snapshot.settings.startMonth });
        await reload();
      },
    );
  };

  const patchFlow = (id: number, patch: { name?: string; color?: string }) =>
    persist(
      (cur) => ({ ...cur, flows: cur.flows.map((f) => (f.id === id ? { ...f, ...patch } : f)) }),
      () => client.flows.update({ id, ...patch }),
    );

  const remove = (id: number) =>
    persist(
      (cur) => ({ ...cur, flows: cur.flows.filter((f) => f.id !== id) }),
      () => client.flows.delete({ id }),
    );

  return (
    <section className="rounded-lg border border-zinc-200 bg-white p-3">
      <h2 className="mb-2 font-semibold">Spendings</h2>
      <div className="space-y-1.5">
        {spendings.map((f) => (
          <div key={f.id} className="rounded border border-zinc-200 p-1.5">
            <div className="flex items-center gap-1.5">
              <ColorSwatch color={f.color} onChange={(c) => patchFlow(f.id, { color: c })} />
              <input
                defaultValue={f.name}
                onBlur={(e) => patchFlow(f.id, { name: e.target.value })}
                className="min-w-0 flex-1 rounded border border-transparent px-1 py-0.5 text-sm text-zinc-900 hover:border-zinc-200"
              />
              <button type="button" onClick={() => setExpanded(expanded === f.id ? null : f.id)} className="text-zinc-400">
                {expanded === f.id ? '▾' : '▸'}
              </button>
              <button type="button" onClick={() => remove(f.id)} className="text-zinc-400 hover:text-red-600">
                ✕
              </button>
            </div>
            {expanded === f.id && <PeriodRows flow={f} budget={budget} />}
          </div>
        ))}
      </div>
      <AddLink label="add spending" onClick={add} />
    </section>
  );
}
```

- [ ] **Step 6: Income section**

Create `apps/web/app/_components/sidebar/income-section.tsx`:

```tsx
'use client';

import { useState } from 'react';
import type { useBudget } from '../use-budget';
import { nextColor, PALETTE } from '@/lib/palette';
import { AddLink } from './add-link';
import { ColorSwatch } from './color-swatch';
import { PeriodRows } from './period-rows';

export function IncomeSection({ budget }: { budget: ReturnType<typeof useBudget> }) {
  const { snapshot, persist, client, reload } = budget;
  const [expanded, setExpanded] = useState<number | null>(null);
  const income = snapshot.flows.filter((f) => f.kind === 'income');

  const add = () => {
    const color = nextColor(PALETTE, snapshot.flows.length);
    persist(
      (cur) => cur,
      async () => {
        await client.flows.create({ kind: 'income', name: 'New income', color, position: income.length, startMonth: snapshot.settings.startMonth });
        await reload();
      },
    );
  };

  const patchFlow = (id: number, patch: { name?: string; color?: string }) =>
    persist(
      (cur) => ({ ...cur, flows: cur.flows.map((f) => (f.id === id ? { ...f, ...patch } : f)) }),
      () => client.flows.update({ id, ...patch }),
    );

  const remove = (id: number) =>
    persist(
      (cur) => ({ ...cur, flows: cur.flows.filter((f) => f.id !== id) }),
      () => client.flows.delete({ id }),
    );

  return (
    <section className="rounded-lg border border-zinc-200 bg-white p-3">
      <h2 className="mb-2 font-semibold">Income</h2>
      <div className="space-y-1.5">
        {income.map((f) => (
          <div key={f.id} className="rounded border border-zinc-200 p-1.5">
            <div className="flex items-center gap-1.5">
              <ColorSwatch color={f.color} onChange={(c) => patchFlow(f.id, { color: c })} />
              <input
                defaultValue={f.name}
                onBlur={(e) => patchFlow(f.id, { name: e.target.value })}
                className="min-w-0 flex-1 rounded border border-transparent px-1 py-0.5 text-sm text-zinc-900 hover:border-zinc-200"
              />
              <button type="button" onClick={() => setExpanded(expanded === f.id ? null : f.id)} className="text-zinc-400">
                {expanded === f.id ? '▾' : '▸'}
              </button>
              <button type="button" onClick={() => remove(f.id)} className="text-zinc-400 hover:text-red-600">
                ✕
              </button>
            </div>
            {expanded === f.id && <PeriodRows flow={f} budget={budget} />}
          </div>
        ))}
      </div>
      <AddLink label="add income" onClick={add} />
    </section>
  );
}
```

- [ ] **Step 7: Taxes section**

Create `apps/web/app/_components/sidebar/taxes-section.tsx`:

```tsx
'use client';

import type { useBudget } from '../use-budget';
import { nextColor, TAX_PALETTE } from '@/lib/palette';
import { AddLink } from './add-link';
import { ColorSwatch } from './color-swatch';

export function TaxesSection({ budget }: { budget: ReturnType<typeof useBudget> }) {
  const { snapshot, persist, client, reload } = budget;
  const taxes = snapshot.taxes;

  const add = () => {
    const color = nextColor(TAX_PALETTE, taxes.length);
    persist(
      (cur) => cur,
      async () => {
        await client.taxes.create({ name: 'New tax', mode: 'percent', rateBps: 0, amountMinor: null, color, position: taxes.length });
        await reload();
      },
    );
  };

  const patch = (id: number, p: Partial<(typeof taxes)[number]>) =>
    persist(
      (cur) => ({ ...cur, taxes: cur.taxes.map((t) => (t.id === id ? { ...t, ...p } : t)) }),
      () => client.taxes.update({ id, ...p }),
    );

  const remove = (id: number) =>
    persist(
      (cur) => ({ ...cur, taxes: cur.taxes.filter((t) => t.id !== id) }),
      () => client.taxes.delete({ id }),
    );

  return (
    <section className="rounded-lg border border-zinc-200 bg-white p-3">
      <h2 className="mb-2 font-semibold">Taxes</h2>
      <div className="space-y-1.5">
        {taxes.map((t) => (
          <div key={t.id} className="flex items-center gap-1.5 rounded border border-zinc-200 p-1.5">
            <ColorSwatch color={t.color} options={TAX_PALETTE} onChange={(c) => patch(t.id, { color: c })} />
            <input
              defaultValue={t.name}
              onBlur={(e) => patch(t.id, { name: e.target.value })}
              className="min-w-0 flex-1 rounded border border-transparent px-1 py-0.5 text-sm text-zinc-900 hover:border-zinc-200"
            />
            <select
              value={t.mode}
              onChange={(e) =>
                patch(t.id, e.target.value === 'percent' ? { mode: 'percent', amountMinor: null, rateBps: t.rateBps ?? 0 } : { mode: 'fixed', rateBps: null, amountMinor: t.amountMinor ?? 0 })
              }
              className="rounded border border-zinc-300 px-1 py-0.5 text-xs text-zinc-900"
            >
              <option value="percent">%</option>
              <option value="fixed">fixed</option>
            </select>
            {t.mode === 'percent' ? (
              <input
                type="number"
                step="0.01"
                defaultValue={(t.rateBps ?? 0) / 100}
                onBlur={(e) => patch(t.id, { rateBps: Math.round(Number(e.target.value) * 100) })}
                className="w-14 rounded border border-zinc-300 px-1 py-0.5 text-xs text-zinc-900"
              />
            ) : (
              <input
                type="number"
                defaultValue={(t.amountMinor ?? 0) / 100}
                onBlur={(e) => patch(t.id, { amountMinor: Math.round(Number(e.target.value) * 100) })}
                className="w-16 rounded border border-zinc-300 px-1 py-0.5 text-xs text-zinc-900"
              />
            )}
            <button type="button" onClick={() => remove(t.id)} className="text-zinc-400 hover:text-red-600">
              ✕
            </button>
          </div>
        ))}
      </div>
      <AddLink label="add tax" onClick={add} />
    </section>
  );
}
```

- [ ] **Step 8: Events section**

Create `apps/web/app/_components/sidebar/events-section.tsx`:

```tsx
'use client';

import type { useBudget } from '../use-budget';
import { nextColor, PALETTE } from '@/lib/palette';
import { AddLink } from './add-link';
import { ColorSwatch } from './color-swatch';

export function EventsSection({ budget }: { budget: ReturnType<typeof useBudget> }) {
  const { snapshot, persist, client, reload } = budget;
  const events = snapshot.events;

  const add = () => {
    const color = nextColor(PALETTE, snapshot.flows.length + events.length);
    persist(
      (cur) => cur,
      async () => {
        await client.events.create({ name: 'New event', month: snapshot.settings.startMonth, amountMinor: 0, color });
        await reload();
      },
    );
  };

  const patch = (id: number, p: Partial<(typeof events)[number]>) =>
    persist(
      (cur) => ({ ...cur, events: cur.events.map((e) => (e.id === id ? { ...e, ...p } : e)) }),
      () => client.events.update({ id, ...p }),
    );

  const remove = (id: number) =>
    persist(
      (cur) => ({ ...cur, events: cur.events.filter((e) => e.id !== id) }),
      () => client.events.delete({ id }),
    );

  return (
    <section className="rounded-lg border border-zinc-200 bg-white p-3">
      <h2 className="mb-2 font-semibold">Events</h2>
      <div className="space-y-1.5">
        {events.map((e) => (
          <div key={e.id} className="flex items-center gap-1.5 rounded border border-zinc-200 p-1.5">
            <ColorSwatch color={e.color ?? PALETTE[0]} onChange={(c) => patch(e.id, { color: c })} />
            <input
              defaultValue={e.name}
              onBlur={(ev) => patch(e.id, { name: ev.target.value })}
              className="min-w-0 flex-1 rounded border border-transparent px-1 py-0.5 text-sm text-zinc-900 hover:border-zinc-200"
            />
            <input
              type="month"
              defaultValue={e.month.slice(0, 7)}
              onBlur={(ev) => ev.target.value && patch(e.id, { month: `${ev.target.value}-01` })}
              className="rounded border border-zinc-300 px-1 py-0.5 text-xs text-zinc-900"
            />
            <input
              type="number"
              defaultValue={e.amountMinor / 100}
              onBlur={(ev) => patch(e.id, { amountMinor: Math.round(Number(ev.target.value) * 100) })}
              className="w-16 rounded border border-zinc-300 px-1 py-0.5 text-xs text-zinc-900"
            />
            <button type="button" onClick={() => remove(e.id)} className="text-zinc-400 hover:text-red-600">
              ✕
            </button>
          </div>
        ))}
      </div>
      <AddLink label="add event" onClick={add} />
    </section>
  );
}
```

- [ ] **Step 9: Commit**

```bash
git add apps/web/app/_components/sidebar
git commit -m "feat(web): budget setup sidebar sections"
```

---

## Task 12: Chart components

**Files:**
- Create: `apps/web/app/_components/chart/chart-grid.tsx`
- Create: `apps/web/app/_components/chart/income-bars-panel.tsx`
- Create: `apps/web/app/_components/chart/savings-panel.tsx`
- Create: `apps/web/app/_components/chart/timeline-chart.tsx`

Shared geometry: each month column is `COL = 34px` wide with a `GAP = 10px`; bars are `COL - GAP`. The chart width is `months.length * COL + PAD`.

- [ ] **Step 1: Chart constants + grid**

Create `apps/web/app/_components/chart/chart-grid.tsx`:

```tsx
import type { ProjectionMonth } from '@budget-timeline/shared/projection';

export const COL = 34;
export const GAP = 10;
export const PAD_L = 8;
export const chartWidth = (n: number) => PAD_L + n * COL + 8;
export const colX = (i: number) => PAD_L + i * COL;

/** Dashed vertical lines + year labels at each January (and the first month). */
export function YearBoundaries({ months, height }: { months: ProjectionMonth[]; height: number }) {
  return (
    <>
      {months.map((m, i) =>
        m.isYearStart ? (
          <g key={m.monthIndex}>
            <line x1={colX(i) - GAP / 2} y1={0} x2={colX(i) - GAP / 2} y2={height} stroke="#cbd5e1" strokeDasharray="3 3" />
            <text x={colX(i) - GAP / 2 + 3} y={11} fontSize={10} fontWeight={600} fill="#475569">
              {m.year}
            </text>
          </g>
        ) : null,
      )}
    </>
  );
}
```

- [ ] **Step 2: Income bars panel**

Create `apps/web/app/_components/chart/income-bars-panel.tsx`:

```tsx
import type { ProjectionMonth } from '@budget-timeline/shared/projection';
import { SAVINGS_GREEN } from '@/lib/palette';
import { COL, GAP, YearBoundaries, chartWidth, colX } from './chart-grid';

const HEIGHT = 220;
const TOP = 16;

export function IncomeBarsPanel({ months, maxIncome }: { months: ProjectionMonth[]; maxIncome: number }) {
  const plotH = HEIGHT - TOP - 18;
  const scale = (v: number) => (maxIncome > 0 ? (v / maxIncome) * plotH : 0);
  const bw = COL - GAP;

  return (
    <svg width={chartWidth(months.length)} height={HEIGHT} className="block">
      <YearBoundaries months={months} height={HEIGHT} />
      <line x1={0} y1={TOP + plotH} x2={chartWidth(months.length)} y2={TOP + plotH} stroke="#94a3b8" />
      {months.map((m, i) => {
        const x = colX(i);
        let acc = 0;
        const segs = [...m.taxBreakdown, ...m.spendBreakdown];
        const rects = segs.map((s) => {
          const h = scale(s.amount);
          const y = TOP + plotH - acc - h;
          acc += h;
          return <rect key={`${m.monthIndex}-${s.id}-${s.name}`} x={x} y={y} width={bw} height={Math.max(0, h)} fill={s.color ?? '#999'} />;
        });
        const leftoverH = m.leftover > 0 ? scale(m.leftover) : 0;
        const leftoverY = TOP + plotH - acc - leftoverH;
        const pct = m.income > 0 ? Math.round((m.leftover / m.income) * 100) : 0;
        return (
          <g key={m.monthIndex}>
            {rects}
            {leftoverH > 0 && <rect x={x} y={leftoverY} width={bw} height={leftoverH} fill={SAVINGS_GREEN} rx={1} />}
            {m.isYearStart && m.income > 0 && (
              <text x={x + bw / 2} y={leftoverY - 3} fontSize={9} fontWeight={700} fill={SAVINGS_GREEN} textAnchor="middle">
                {pct}%
              </text>
            )}
            <text x={x + bw / 2} y={TOP + plotH + 13} fontSize={9} fill="#64748b" textAnchor="middle">
              {m.label}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
```

- [ ] **Step 3: Savings panel**

Create `apps/web/app/_components/chart/savings-panel.tsx`:

```tsx
import type { ProjectionMonth } from '@budget-timeline/shared/projection';
import { SAVINGS_GREEN } from '@/lib/palette';
import { COL, GAP, YearBoundaries, chartWidth, colX } from './chart-grid';

const HEIGHT = 130;
const TOP = 10;

export function SavingsPanel({ months }: { months: ProjectionMonth[] }) {
  const plotH = HEIGHT - TOP - 10;
  const values = months.map((m) => m.cumulative);
  const max = Math.max(1, ...values);
  const min = Math.min(0, ...values);
  const y = (v: number) => TOP + plotH - ((v - min) / (max - min)) * plotH;
  const cx = (i: number) => colX(i) + (COL - GAP) / 2;

  const line = months.map((m, i) => `${i ? 'L' : 'M'}${cx(i)} ${y(m.cumulative)}`).join('');
  const area = `${line}L${cx(months.length - 1)} ${TOP + plotH}L${cx(0)} ${TOP + plotH}Z`;

  return (
    <svg width={chartWidth(months.length)} height={HEIGHT} className="block">
      <YearBoundaries months={months} height={HEIGHT} />
      <line x1={0} y1={y(0)} x2={chartWidth(months.length)} y2={y(0)} stroke="#e5e7eb" />
      <path d={area} fill={`${SAVINGS_GREEN}22`} />
      <path d={line} fill="none" stroke="#0f172a" strokeWidth={2} />
      {months.map((m, i) =>
        m.events.map((e) => (
          <g key={`${m.monthIndex}-${e.id}`}>
            <line x1={cx(i)} y1={y(months[i - 1]?.cumulative ?? m.cumulative + e.amount)} x2={cx(i)} y2={y(m.cumulative)} stroke={e.color ?? '#dc2626'} strokeWidth={2} />
            <circle cx={cx(i)} cy={y(m.cumulative)} r={3.5} fill="#fff" stroke={e.color ?? '#dc2626'} strokeWidth={2} />
            <text x={cx(i) + 5} y={y(m.cumulative) - 4} fontSize={9} fontWeight={700} fill={e.color ?? '#dc2626'}>
              {e.name}
            </text>
          </g>
        )),
      )}
    </svg>
  );
}
```

- [ ] **Step 4: Timeline chart (orchestrator, shared horizontal scroll)**

Create `apps/web/app/_components/chart/timeline-chart.tsx`:

```tsx
'use client';

import type { Projection } from '@budget-timeline/shared/projection';
import { IncomeBarsPanel } from './income-bars-panel';
import { SavingsPanel } from './savings-panel';

export function TimelineChart({ projection }: { projection: Projection }) {
  const months = projection.months;
  const maxIncome = Math.max(1, ...months.map((m) => m.income));

  return (
    <div className="overflow-x-auto rounded-lg border border-zinc-200 bg-white">
      <div className="inline-block min-w-full">
        <div className="border-b border-zinc-100 px-2 pt-1 text-xs font-medium text-zinc-500">Income & spending</div>
        <IncomeBarsPanel months={months} maxIncome={maxIncome} />
        <div className="border-y border-zinc-100 px-2 pt-1 text-xs font-medium text-zinc-500">Cumulative savings</div>
        <SavingsPanel months={months} />
      </div>
    </div>
  );
}
```

- [ ] **Step 5: Commit**

```bash
git add apps/web/app/_components/chart
git commit -m "feat(web): two-panel SVG timeline chart"
```

---

## Task 13: Assemble the screen + page + cleanup

**Files:**
- Create: `apps/web/app/_components/budget-screen.tsx`
- Modify: `apps/web/app/page.tsx`
- Delete: `apps/web/app/new-milestone-form.tsx`

- [ ] **Step 1: Budget screen (layout + collapse + horizon toggle)**

Create `apps/web/app/_components/budget-screen.tsx`:

```tsx
'use client';

import type { Snapshot } from '@budget-timeline/core/types';
import { useState } from 'react';
import { TimelineChart } from './chart/timeline-chart';
import { EventsSection } from './sidebar/events-section';
import { IncomeSection } from './sidebar/income-section';
import { SetupSection } from './sidebar/setup-section';
import { SpendingsSection } from './sidebar/spendings-section';
import { TaxesSection } from './sidebar/taxes-section';
import { useBudget } from './use-budget';

export function BudgetScreen({ initial }: { initial: Snapshot }) {
  const budget = useBudget(initial);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const { snapshot, persist, client } = budget;

  const setHorizon = (horizonYears: 5 | 10) =>
    persist(
      (cur) => ({ ...cur, settings: { ...cur.settings, horizonYears } }),
      () => client.settings.update({ horizonYears }),
    );

  return (
    <div className="flex h-screen overflow-hidden">
      {sidebarOpen && (
        <aside className="w-[300px] flex-none space-y-3 overflow-y-auto border-r border-zinc-200 bg-zinc-50 p-3">
          <div className="flex items-center justify-between">
            <h1 className="font-semibold">My Budget</h1>
            <button type="button" onClick={() => setSidebarOpen(false)} className="text-xs text-zinc-500">◀ collapse</button>
          </div>
          <SetupSection budget={budget} />
          <IncomeSection budget={budget} />
          <TaxesSection budget={budget} />
          <SpendingsSection budget={budget} />
          <EventsSection budget={budget} />
        </aside>
      )}
      <main className="flex-1 overflow-hidden p-4">
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            {!sidebarOpen && (
              <button type="button" onClick={() => setSidebarOpen(true)} className="text-xs text-zinc-500">▶ inputs</button>
            )}
            <h2 className="font-semibold">Timeline</h2>
          </div>
          <div className="flex overflow-hidden rounded-md border border-zinc-200 text-sm">
            {([5, 10] as const).map((y) => (
              <button
                key={y}
                type="button"
                onClick={() => setHorizon(y)}
                className={snapshot.settings.horizonYears === y ? 'bg-blue-600 px-3 py-1 text-white' : 'px-3 py-1 text-zinc-600'}
              >
                {y} yrs
              </button>
            ))}
          </div>
        </div>
        <TimelineChart projection={budget.projection} />
      </main>
    </div>
  );
}
```

- [ ] **Step 2: Server page seeds the snapshot**

Overwrite `apps/web/app/page.tsx`:

```tsx
import { client } from '@/lib/orpc';
import { BudgetScreen } from './_components/budget-screen';

export default async function Page() {
  const initial = await client.snapshot();
  return <BudgetScreen initial={initial} />;
}
```

- [ ] **Step 3: Delete the scaffold form**

Run: `git rm apps/web/app/new-milestone-form.tsx`
Expected: file removed (it referenced the deleted `milestones` procedures).

- [ ] **Step 4: Type-check the web app**

Run: `pnpm --filter @budget-timeline/web exec tsc --noEmit`
Expected: no errors. If `@budget-timeline/shared/projection` or `@budget-timeline/core/types` are unresolved, confirm the `exports` edits from Tasks 3 and 10 landed and re-run `pnpm install`.

- [ ] **Step 5: Lint + commit**

Run: `pnpm lint`
Expected: clean (or auto-fixable — run `pnpm format` if needed).

```bash
git add apps/web/app
git commit -m "feat(web): assemble budget screen + snapshot page; remove milestones scaffold"
```

---

## Task 14: Update docs + full verification

**Files:**
- Modify: `CLAUDE.md`

- [ ] **Step 1: Update CLAUDE.md conventions**

In `CLAUDE.md`, update the currency line under **Conventions** from:

```
- Currency display defaults to CHF / `de-CH` locale.
```

to:

```
- Currency display defaults to PLN; selectable per budget among PLN/USD/EUR/RUB via `displayMoney(minor, currency)` in `packages/shared/money.js`.
- Month-granular fields are stored as first-of-month ISO dates (`YYYY-MM-01`).
```

- [ ] **Step 2: Run the whole test suite**

Run: `pnpm test`
Expected: shared + core suites pass.

- [ ] **Step 3: Manual verification (verify skill)**

Run: `pnpm db:migrate` (ensure dev DB is current), then `pnpm dev`. In a browser at `http://localhost:4000`:
- Add an income (set an amount in its period) → bars appear, green leftover cap shows.
- Add a percent tax and a fixed tax → red/orange segments appear at the bottom of each bar.
- Add a spending; expand it; add a second period with a later start month and different amount → the bar heights change at that month; the first period auto-closed.
- Add an event with a budget at a future month → the savings line dips at that month with a labelled marker.
- Recolor an item via the swatch → chart updates.
- Toggle 5y/10y → chart widens/narrows; horizontal scroll works.
- Collapse the sidebar → chart takes full width.

Confirm each edit reflects **immediately** and reloading the page preserves the data (persistence works). Capture the observed result before claiming done.

- [ ] **Step 4: Commit**

```bash
git add CLAUDE.md
git commit -m "docs: update conventions for PLN currency + month date format"
```

---

## Self-review notes (addressed)

- **Spec coverage:** timeline chart (Tasks 12–13), two synced panels + year boundaries + scroll (Task 12), 5y/10y toggle (Task 13), stacked income composition with green leftover cap + % label (Task 12), cumulative savings + event withdrawals (Tasks 3, 12), per-tax percent/fixed (Tasks 7, 9, 11), income/spending flows with periods (Tasks 6, 11), color palette with reserved green (Tasks 10–12), PLN-default multi-currency (Tasks 1, 11, 14), single budget / settings (Task 5), client-side projection + thin CRUD (Tasks 3–9), `_components` layout with thin `page.tsx` (Task 13), milestones replacement (Tasks 2, 13).
- **Deferred (not built):** combined overlay, 100%-normalized bars, multi-scenario, tax periods, below-baseline deficit rendering — matching the spec's deferred list.
- **Type consistency:** service signatures (`getSettings/updateSettings`, `listFlows/createFlow/updateFlow/deleteFlow/addPeriod/updatePeriod/deletePeriod`, `listTaxes/createTax/...`, `listEvents/createEvent/...`) are used identically in the router (Task 9) and the web hook/sections (Tasks 10–13). `computeProjection` input/output match `projection.d.ts` and the chart props.
