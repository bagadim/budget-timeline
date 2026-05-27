# Initial scaffold design — budget-timeline

**Date:** 2026-05-27
**Status:** Approved (brainstorming phase)

## Overview

`budget-timeline` is a personal budget tracker with a timeline view and **milestones** (planned trips/events with target budgets). The app will track income and expenses over time and, given upcoming milestones, suggest how much can be spent and adjust projections as actual spending happens.

This spec covers the **initial local scaffold only** — repo layout, tech stack wiring, and one minimal end-to-end vertical slice (a `milestones` table with list/create). Real features come in later specs.

## Goals

- A working local dev environment: `pnpm install && pnpm db:migrate && pnpm dev` boots the whole stack.
- End-to-end type safety from SQLite → server handler → web client → React render.
- A scaffold that proves out every layer of the chosen stack (oRPC, Drizzle, Fastify, Next.js, Tailwind, Radix, TS/JS mix).
- Future-Claude-friendly: `CLAUDE.md` + this spec leave enough context for the next session to pick up cleanly.

## Non-goals

- No authentication.
- No deployment (Hetzner VPS, Nginx, Cloudflare tunnel, Tailscale all come later).
- No Python tooling yet (placeholder folder only).
- No payments, no AI, no maps, no image storage. Those technologies are on the stack list but only adopted when needed.
- No real features yet — `milestones` exists only as a vertical slice to prove the wiring.

## Stack decisions

| Layer | Choice | Reason |
|---|---|---|
| Package manager | **pnpm 10** | Native monorepo support, fast, already on the box |
| Node | **22 LTS** | Pinned via `.nvmrc` and `engines` |
| Repo layout | **pnpm monorepo (apps + packages)** | Matches oRPC service-first pattern from official docs |
| Language | **TS + JS mix** | TS at all cross-package boundaries; JS allowed for pure utility functions (`allowJs: true`, `checkJs: false`) |
| Lint/format | **Biome** | Single fast tool, one config, handles TS+JS |
| Test | **Vitest** | One framework for Node (Fastify) and React (Next.js) |
| Backend framework | **Fastify 5** | Per stack |
| RPC | **oRPC** with `@orpc/server/fastify` adapter + Zod | Per stack; official adapter pattern verified |
| DB driver | **better-sqlite3** | Sync, fastest SQLite driver |
| ORM | **Drizzle ORM** + `drizzle-kit` | Typed schema, SQL-forward, lightweight |
| Web framework | **Next.js 15** (app router) + React 19 | Per stack |
| Styling | **Tailwind CSS v4** | Per stack; v4 is the current default |
| Components | **Radix Primitives** (unstyled) + Tailwind classes | Maximum design control; same pattern shadcn/ui uses. No Radix Themes (would conflict with Tailwind styling) |

## Repo layout

```
budget-timeline/
├─ apps/
│  ├─ web/                Next.js 15 (app router) + Tailwind v4 + Radix Primitives
│  └─ api/                Fastify 5 + oRPC Fastify adapter
├─ packages/
│  ├─ core/               oRPC procedures + Zod schemas (service-first)
│  ├─ db/                 Drizzle schema, migrations, SQLite client factory
│  └─ shared/             Plain JS utilities (money formatting, date math, etc.)
├─ scripts/               Placeholder; Python tools later
├─ docs/
│  └─ superpowers/specs/  This file and future design docs
├─ data/                  SQLite file lives here (gitignored)
├─ .env.example           DB_FILE, PORT
├─ .nvmrc                 22
├─ biome.json             Root lint/format config
├─ tsconfig.base.json     Shared TS config (allowJs, strict, bundler resolution)
├─ pnpm-workspace.yaml
├─ package.json           Root scripts + workspaces
├─ CLAUDE.md              Project context for future Claude sessions
└─ README.md
```

### Why these packages

- **`packages/core`** holds the oRPC router. `apps/api` imports it to run the server. `apps/web` imports it for `RouterClient<typeof router>` types only — TypeScript erases the import at build time, so no server code ships to the browser.
- **`packages/db`** is separate from `core` because both `core` (runtime queries) and `drizzle-kit` (migration tooling) need to point at the schema, and we may want to add seed/maintenance scripts later that depend on the DB without depending on the RPC layer.
- **`packages/shared`** is for plain-JS utilities. Keeping it as its own package is what makes the TS/JS mix policy explicit and prevents the JS files from creeping into the typed parts of the codebase.

### TypeScript project references

Skipped for v1. pnpm workspace resolution + `paths` in `tsconfig.base.json` is enough at this size. Revisit (`composite: true`) only if IDE/incremental-build performance degrades.

## Example feature — milestones (vertical slice)

The smallest feature that exercises every layer.

### Schema (`packages/db/schema.ts`)

```ts
import { sqliteTable, integer, text } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';

export const milestones = sqliteTable('milestones', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  targetCents: integer('target_cents').notNull(),
  targetDate: text('target_date').notNull(),         // ISO 'YYYY-MM-DD'
  createdAt: text('created_at').default(sql`current_timestamp`).notNull(),
});
```

Money is stored as integer cents (avoids floating-point money bugs).

### DB client (`packages/db/index.ts`)

```ts
import { drizzle } from 'drizzle-orm/better-sqlite3';
import * as schema from './schema';
export const db = drizzle({
  connection: { source: process.env.DB_FILE ?? 'data/budget.db' },
  schema,
});
export * from './schema';
```

### Router (`packages/core/router.ts`)

```ts
import { os } from '@orpc/server';
import { z } from 'zod';
import { db, milestones } from '@budget-timeline/db';

const list = os.handler(async () => db.select().from(milestones).all());

const create = os
  .input(z.object({
    name: z.string().min(1),
    targetCents: z.number().int().nonnegative(),
    targetDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  }))
  .handler(async ({ input }) => {
    const [row] = await db.insert(milestones).values(input).returning();
    return row;
  });

export const router = { milestones: { list, create } };
export type Router = typeof router;
```

### API server (`apps/api/src/server.ts`)

```ts
import Fastify from 'fastify';
import { RPCHandler } from '@orpc/server/fastify';
import { router } from '@budget-timeline/core';

const rpcHandler = new RPCHandler(router);
const fastify = Fastify({ logger: true });

fastify.addContentTypeParser('*', (_req, _payload, done) => done(null, undefined));
fastify.all('/rpc/*', async (req, reply) => {
  const { matched } = await rpcHandler.handle(req, reply, { prefix: '/rpc' });
  if (!matched) reply.status(404).send('Not found');
});

fastify.listen({ port: Number(process.env.PORT ?? 3001) });
```

### Web client (`apps/web/lib/orpc.ts`)

```ts
import { createORPCClient } from '@orpc/client';
import { RPCLink } from '@orpc/client/fetch';
import type { RouterClient } from '@orpc/server';
import type { Router } from '@budget-timeline/core';

const link = new RPCLink({ url: '/rpc' });
export const client: RouterClient<Router> = createORPCClient(link);
```

### Next config rewrite (`apps/web/next.config.ts`)

```ts
async rewrites() {
  return [{ source: '/rpc/:path*', destination: 'http://localhost:3001/rpc/:path*' }];
}
```

The browser hits same-origin `/rpc/*`; Next dev server proxies to the Fastify backend. No CORS in dev.

### Web page (`apps/web/app/page.tsx`)

Server Component that calls `client.milestones.list()`, renders the list, and includes a `'use client'` `NewMilestoneForm` (Radix Dialog + Tailwind) that calls `client.milestones.create(...)` then triggers a `router.refresh()`.

### Plain JS utility (`packages/shared/money.js`)

```js
export const centsToDisplay = (cents, locale = 'en-CH', currency = 'CHF') =>
  new Intl.NumberFormat(locale, { style: 'currency', currency }).format(cents / 100);
```

Imported from `apps/web/app/page.tsx` (TS) — demonstrates the TS/JS mix policy.

## Local dev workflow

Root `package.json` scripts:

| Script | What it does |
|---|---|
| `pnpm dev` | `pnpm -r --parallel dev` — runs web on :3000, api on :3001 |
| `pnpm build` | Recursive build across workspaces |
| `pnpm lint` | Biome check |
| `pnpm test` | Vitest across workspaces |
| `pnpm db:generate` | `drizzle-kit generate` — produces migration SQL from schema diff |
| `pnpm db:migrate` | Applies pending migrations to the local SQLite file |
| `pnpm db:studio` | Opens drizzle-kit's browser UI |

### Environment

`.env.example` committed:
```
DB_FILE=./data/budget.db
PORT=3001
```
`.env` and `data/*.db` are gitignored.

### First-run sequence

```
pnpm install
pnpm db:generate         # produces initial migration from milestones schema
pnpm db:migrate          # creates data/budget.db, applies migration
pnpm dev                 # http://localhost:3000
```

## CLAUDE.md content (sketch)

To be written during implementation:

- One-paragraph project description.
- Stack one-liner with file pointers (`apps/api`, `apps/web`, `packages/core`, `packages/db`, `packages/shared`).
- TS/JS rule: TS for contracts/handlers/components; plain JS allowed for pure utils.
- Dev command cheat sheet.
- Pointer to `docs/superpowers/specs/` for design history.
- List of skills particularly useful for this codebase: `superpowers:brainstorming`, `writing-plans`, `executing-plans`, `test-driven-development`, `systematic-debugging`, `frontend-design`, `code-review`, `verify`, `commit-commands:commit-push-pr`.

## Git workflow

- `git init -b main` (already done as part of this design phase to commit this spec).
- Initial commits land locally; push to `git@github.com:bagadim/budget-timeline.git` once the scaffold is complete and verified locally.

## Future considerations (out of scope for this spec)

- Auth (likely Lucia or oRPC middleware-based session).
- Domain features: transactions, recurring schedules, projection engine, milestone progress views.
- Deployment: Hetzner VPS + Nginx + Cloudflare tunnel + Tailscale + unattended-upgrades + cron workers.
- xAI integration for "spending suggestion" feature.
- Stripe / R2 / OpenFreeMap — only if and when needed.
- TypeScript project references (`composite: true`) if monorepo IDE perf degrades.
- Splitting `packages/core` into `core-contract` + `core-service` if we add a non-web client (mobile).
