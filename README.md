# budget-timeline

Personal budget tracker with a timeline view and planned milestones (trips, events). Tracks income and expenses and adjusts projections as actual spending happens.

## Stack

pnpm monorepo · Fastify + oRPC backend · Next.js 15 + Tailwind v4 + Radix Primitives frontend · Drizzle ORM + SQLite · TypeScript (with plain-JS utilities)

## Setup

```bash
nvm use
pnpm install
pnpm db:generate
pnpm db:migrate
pnpm dev
```

Web: <http://localhost:4000>
API: <http://localhost:4001> (proxied via Next at `/rpc/*`)

## Layout

- `apps/web` — Next.js app router
- `apps/api` — Fastify server
- `packages/core` — oRPC procedures + Zod schemas
- `packages/db` — Drizzle schema, client, migrations
- `packages/shared` — plain-JS utilities

See `docs/superpowers/specs/` for design history and `CLAUDE.md` for AI-pair-programming context.
