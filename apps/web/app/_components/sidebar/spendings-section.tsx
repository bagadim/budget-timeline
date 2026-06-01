'use client';

import { useState } from 'react';
import { nextColor, PALETTE } from '@/lib/palette';
import type { useBudget } from '../use-budget';
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
        await client.flows.create({
          kind: 'spending',
          name: 'New spending',
          color,
          position: spendings.length,
          startMonth: snapshot.settings.startMonth,
        });
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
              <button
                type="button"
                onClick={() => setExpanded(expanded === f.id ? null : f.id)}
                className="text-zinc-400"
              >
                {expanded === f.id ? '▾' : '▸'}
              </button>
              <button
                type="button"
                onClick={() => remove(f.id)}
                className="text-zinc-400 hover:text-red-600"
              >
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
