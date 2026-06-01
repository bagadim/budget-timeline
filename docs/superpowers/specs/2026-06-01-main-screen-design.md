# Main screen — budget timeline & setup

**Date:** 2026-06-01
**Status:** Approved design, ready for implementation planning

## Purpose

The main screen is the heart of `budget-timeline`. It lets one person plan personal
finances over a multi-year horizon and answer a single question at a glance:

> *Given my income, taxes, and recurring spendings, how do my savings accumulate over
> time — and can I afford the events (trips, purchases) I'm planning?*

It must be **fast to set up**, **easy to read**, and **instant to update** — every edit
re-renders the chart immediately.

This spec replaces the scaffold-only `milestones` feature (list page + `milestones`
table), which existed only to bootstrap the stack.

## Scope (v1)

In scope:

- A single budget (no multi-scenario).
- A timeline chart of monthly income composition + cumulative savings.
- A setup/editing panel for starting savings, income, taxes, spendings, and events.
- Default 5-year horizon, toggle to 10 years.
- Currency selection: **PLN (default)**, USD, EUR, RUB — single display currency per
  budget, no FX conversion (everything entered in the chosen currency).

Explicitly deferred (design stays flexible so these can be added without rework):

- Combined-overlay chart view (savings line drawn over the bars in one panel). v1 ships
  the two-panel layout only.
- 100%-normalized bar mode.
- Multiple saved scenarios.
- Tax periods (start/end months for a tax).
- Below-baseline deficit rendering for overspend months.

## Key decisions

| Topic | Decision |
|---|---|
| Chart layout | **Two synced panels** (income bars on top, cumulative savings area below), shared month axis, horizontal scroll. Combined overlay deferred. |
| Taxes | Per tax: **percentage of gross income** OR **fixed monthly amount**. Always active in v1. |
| Income | A **list of income flows**, multiple allowed and **summed** per month; each flow has value periods over time. |
| Savings line | **Computed from cashflow** (never set directly). |
| Events | A **one-time withdrawal** from cumulative savings at its month, **also drawn** as a downward marker on the savings panel. |
| Overspend month | Bar caps at income, no green leftover cap; the **dip in the savings line** is the signal. No below-baseline rendering. |
| Bars | **Absolute** currency values only (no normalized mode). |
| Period editing | **Inline period rows** (amount + from/to), `+ add period` under the list. |
| Money | Integer **minor units** (grosze/cents); all four currencies use 1/100. `centsToDisplay(minor, locale, currency)` handles display. |
| Dates | Month fields stored as first-of-month ISO dates (`YYYY-MM-01`) to honor the repo `YYYY-MM-DD` convention. |
| Architecture | **Client-side projection** (pure function in `packages/shared`) + **custom SVG** chart; server is thin oRPC CRUD. |

## Architecture

Approach: thin server, smart client.

1. `packages/core` exposes **thin CRUD** oRPC procedures (no projection endpoint).
2. A server component fetches the full snapshot and seeds it into a client
   `<BudgetScreen>`.
3. `<BudgetScreen>` holds the snapshot in React state. On every edit it fires the
   oRPC mutation **and** optimistically updates local state, then recomputes the
   projection locally and re-renders the SVG — instant feedback, no round-trip per
   keystroke. On mutation error, reconcile from the server.
4. The projection math lives as a **pure, unit-tested function** in `packages/shared`
   (plain JS — fits the "pure utilities in shared" rule), imported by the client.

`apps/web` continues to import only types (and pure shared utilities) — no server code
ships to the browser.

## Data model (`packages/db/schema.ts`)

Single budget, month-granular. Money as integer minor units. Replaces the `milestones`
table.

```
settings              (singleton, id = 1)
  startingSavingsMinor int        -- already-cumulated amount at startMonth
  startMonth           text       -- 'YYYY-MM-01', timeline anchor
  currency             text        -- 'PLN' | 'USD' | 'EUR' | 'RUB', default 'PLN'
  horizonYears         int         -- 5 | 10, default 5

flows                              -- income & spending lines
  id          int pk
  kind        text                 -- 'income' | 'spending'
  name        text
  color       text                 -- hex from palette
  position    int                  -- stable stacking order
  createdAt   text                 -- tiebreaker

flow_periods                       -- a flow's value over time (>= 1 row per flow)
  id          int pk
  flowId      int fk -> flows.id (cascade delete)
  amountMinor int
  startMonth  text                 -- 'YYYY-MM-01'
  endMonth    text NULL            -- NULL = endless

taxes
  id          int pk
  name        text
  mode        text                 -- 'percent' | 'fixed'
  rateBps     int NULL             -- when percent: 1200 = 12.00%
  amountMinor int NULL             -- when fixed: minor units / month
  color       text
  position    int
  createdAt   text

events
  id          int pk
  name        text
  month       text                 -- 'YYYY-MM-01'
  amountMinor int                  -- one-time withdrawal from savings
  color       text NULL
  createdAt   text
```

Invariants (enforced in app/service layer, not all by SQLite):

- A flow has **at least one** period.
- Periods within one flow are **sequential / non-overlapping**; adding a new period
  auto-closes the previous one the month before. Empty `endMonth` = endless.
- A tax row has exactly one of `rateBps` / `amountMinor` set per its `mode`.
- `position` gives stable stacking order within `flows` (per kind) and within `taxes`;
  `createdAt` is the tiebreaker.

## Projection engine (`packages/shared/projection.js`)

Pure function — the core domain logic. No I/O, no dates beyond string math.

```
computeProjection({ settings, flows, taxes, events }) -> {
  months: [{
    monthIndex,            // 0-based from startMonth
    label,                 // e.g. 'Jan', 'Feb'
    year,                  // e.g. 2026
    isYearStart,           // true in January (or the very first month)
    income,                // sum of active income flows this month
    taxBreakdown:   [{ id, name, color, amount }],
    spendBreakdown: [{ id, name, color, amount }],
    leftover,              // income - totalTax - totalSpend  (may be < 0)
    cumulative,            // running savings AFTER this month
    events:         [{ id, name, color, amount }]   // withdrawals this month
  }]
}
```

Rules:

- Horizon = `horizonYears * 12` months starting at `settings.startMonth`.
- A flow period is active in month *m* when `startMonth <= m` and (`endMonth` is null or
  `m <= endMonth`).
- `income(m)   = Σ active income-flow amounts`.
- `tax(m)      = Σ fixed.amountMinor + Σ (percent.rateBps / 10000 × income(m))`.
- `spend(m)    = Σ active spending-flow amounts`.
- `leftover(m) = income(m) − tax(m) − spend(m)` (may be negative).
- `cumulative(−1) = startingSavingsMinor`;
  `cumulative(m)  = cumulative(m−1) + leftover(m) − Σ events(m).amount`.
- **Overspend** (`tax + spend > income`): `leftover` is negative; the chart draws no
  green leftover cap and the cumulative line dips. No below-baseline rendering.

## RPC layer (`packages/core`)

Thin CRUD, service-first, Zod-validated. No projection procedure.

- `settings.get`, `settings.update`
- `flows.list`, `flows.create`, `flows.update`, `flows.delete`
- `flows.periods.add`, `flows.periods.update`, `flows.periods.delete`
- `taxes.list`, `taxes.create`, `taxes.update`, `taxes.delete`
- `events.list`, `events.create`, `events.update`, `events.delete`

Validation highlights: `currency` enum; `kind` enum; `mode` enum with the matching
value field present; month strings match `^\d{4}-\d{2}-01$`; minor-unit amounts are
non-negative integers; `rateBps` in `[0, 10000]`.

## UI

### Layout

- **Collapsible left sidebar** (~300px) holds all inputs; the **chart fills the rest of
  the width** and scrolls horizontally. Collapsing the sidebar widens the chart.
- Sidebar sections (top to bottom): **Setup**, **Income**, **Taxes**, **Spendings**,
  **Events**. Each list uses a consistent **`+ add` link button placed under the list**;
  spending flows expand to inline period rows with `+ add period` under them.
- Chart header: title + **5y / 10y** toggle.

### Color palette

Auto-assigned per item, changeable via a swatch popover from a fixed palette:

```
#2563eb  #14b8a6  #f59e0b  #8b5cf6  #ec4899
#06b6d4  #84cc16  #f43f5e  #a855f7  #64748b
```

Taxes default to reds/oranges (`#ef4444`, `#fb923c`). **Green (`#10b981`) is reserved**
for the leftover-saved cap and savings line and is not selectable for categories.

### Chart (two synced panels, custom SVG)

- **Top panel — income composition bars.** Bar height = income that month. Stacked
  bottom-up: taxes → spendings → **green leftover cap**. Periodic "% saved" labels above
  bars.
- **Bottom panel — cumulative savings.** Filled area + line of `cumulative`; event
  withdrawals drawn as downward markers in the event's color (default red when unset),
  labelled with name + amount.
- **Shared month axis:** month labels; dashed vertical line + year label at each January
  (and the first month). Horizontal scroll; panels scroll together.
- Built so the deferred combined-overlay view can reuse the same series.

### Components (`apps/web/app/_components`)

```
app/page.tsx                       -- server component: fetch snapshot, render <BudgetScreen initial={…}>
app/_components/
  budget-screen.tsx                -- 'use client'; state, optimistic edits, projection recompute, layout
  sidebar/
    setup-section.tsx
    income-section.tsx
    taxes-section.tsx
    spendings-section.tsx          -- flow rows + inline period rows
    events-section.tsx
    period-rows.tsx
    add-link.tsx                   -- shared "+ add" / "+ add period" button
    color-swatch.tsx               -- palette popover (green reserved)
  chart/
    timeline-chart.tsx             -- orchestrates the two panels + axis + scroll
    income-bars-panel.tsx
    savings-panel.tsx
    chart-grid.tsx                 -- axes, gridlines, year boundaries
```

`page.tsx` only imports and renders the main page component; logic lives in
`budget-screen.tsx`.

## Testing

- **Unit (vitest) — `projection.js`:** income summing across multiple flows; percent vs
  fixed taxes; period activation at boundaries; endless periods; event withdrawals;
  overspend (negative leftover); 5y vs 10y horizon length; `isYearStart` correctness.
- **RPC:** create/update/delete round-trips for each entity; Zod validation rejects bad
  currency / mode / month / negative amounts.
- **Manual (`verify` skill):** `pnpm dev`; add income/taxes/spendings (incl. a multi-period
  spending) and an event; recolor items; toggle 5y/10y; confirm the chart updates
  instantly and reads correctly, in a browser, before claiming done.

## Migration note

The `milestones` table and its scaffold UI (`apps/web/app/page.tsx` list,
`new-milestone-form.tsx`) are removed and replaced by the schema and screen above. A new
Drizzle migration drops `milestones` and creates `settings`, `flows`, `flow_periods`,
`taxes`, `events`.
```
