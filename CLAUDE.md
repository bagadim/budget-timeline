# budget-timeline — Claude context

Personal budget tracker with a timeline view and planned milestones (trips, events with target budgets). Tracks income/expenses over time and adjusts projections as spending happens.

## Stack & where things live

| Layer | Path | Notes |
|---|---|---|
| Web | `apps/web/` | Next.js 15 app router, Tailwind v4, Radix Primitives |
| API | `apps/api/` | Fastify 5 with oRPC adapter on `/rpc/*` |
| RPC layer | `packages/core/` | oRPC procedures + Zod schemas; service-first pattern |
| Database | `packages/db/` | Drizzle ORM + better-sqlite3; schema in `schema.ts`, migrations in `migrations/` |
| JS utilities | `packages/shared/` | Plain JS (no types). Imported by TS files |

`apps/web` imports types only from `packages/core` (`RouterClient<typeof router>`) — no server code ships to the browser.

## TS/JS rule

- **TypeScript** for: oRPC contracts, server handlers, React components, anything crossing a package boundary.
- **Plain JavaScript** (no types) is allowed for pure utility functions in `packages/shared/`. Configured in `tsconfig.base.json` with `allowJs: true`, `checkJs: false`.

## Dev commands

```bash
nvm use                  # Node 22
pnpm install
pnpm db:generate         # produce migration SQL from schema diff
pnpm db:migrate          # apply migrations to data/budget.db
pnpm dev                 # web on :4000, api on :4001 (proxied via Next /rpc/*)
pnpm test                # vitest across workspaces
pnpm lint                # biome
```

## Useful skills for this codebase

When working on this repo, these skills are particularly applicable:

- `superpowers:brainstorming` — before any new feature
- `superpowers:writing-plans` / `superpowers:executing-plans` / `superpowers:subagent-driven-development` — multi-step work
- `superpowers:test-driven-development` — before writing implementation code
- `superpowers:systematic-debugging` — when something breaks
- `frontend-design` — Next.js pages/components with real design quality (not generic AI look)
- `code-review` / `simplify` — before merging
- `verify` — run `pnpm dev` and exercise UI changes in a browser before claiming done
- `commit-commands:commit` / `commit-commands:commit-push-pr` — git workflow

## Design history

See `docs/superpowers/specs/` for design docs (the "why" behind decisions). The first one is `2026-05-27-initial-scaffold-design.md` which captures the original stack rationale.

## Conventions

- Money is stored as integer cents to avoid floating-point issues.
- Dates are ISO `YYYY-MM-DD` strings (TEXT in SQLite). No native DATE type usage.
- Currency display defaults to CHF / `de-CH` locale.
- Cross-package imports use the `@budget-timeline/*` scope and `workspace:*` protocol.
