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
