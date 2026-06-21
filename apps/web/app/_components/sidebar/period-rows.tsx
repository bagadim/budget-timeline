'use client';

import type { FlowWithPeriods } from '@budget-timeline/core/types';
import type { useBudget } from '../use-budget';
import { AddLink } from './add-link';

export function PeriodRows({
  flow,
  budget,
}: {
  flow: FlowWithPeriods;
  budget: ReturnType<typeof useBudget>;
}) {
  const { snapshot, persist, client } = budget;

  const patchPeriod = (
    id: number,
    patch: { amountMinor?: number; startMonth?: string; endMonth?: string | null },
  ) =>
    persist(
      (cur) => ({
        ...cur,
        flows: cur.flows.map((f) =>
          f.id === flow.id
            ? { ...f, periods: f.periods.map((p) => (p.id === id ? { ...p, ...patch } : p)) }
            : f,
        ),
      }),
      () => client.flows.periods.update({ id, ...patch }),
    );

  const addPeriod = () => {
    const startMonth = snapshot.settings.startMonth;
    persist(
      (cur) => cur,
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
        flows: cur.flows.map((f) =>
          f.id === flow.id ? { ...f, periods: f.periods.filter((p) => p.id !== id) } : f,
        ),
      }),
      () => client.flows.periods.delete({ id }),
    );

  return (
    <div className="mt-1.5 space-y-2 border-l-2 border-zinc-100 pl-2">
      {flow.periods.map((p) => (
        <div key={p.id} className="space-y-1 text-xs">
          <div className="flex items-center gap-1.5">
            <input
              type="number"
              defaultValue={p.amountMinor / 100}
              onBlur={(e) =>
                patchPeriod(p.id, { amountMinor: Math.round(Number(e.target.value) * 100) })
              }
              className="min-w-0 flex-1 rounded border border-zinc-300 px-1 py-0.5 text-zinc-900"
            />
            {flow.periods.length > 1 && (
              <button
                type="button"
                onClick={() => removePeriod(p.id)}
                aria-label="Remove period"
                className="shrink-0 px-1 text-zinc-400 hover:text-red-600"
              >
                ✕
              </button>
            )}
          </div>
          <label className="flex items-center gap-1.5 text-zinc-400">
            <span className="w-7 shrink-0 text-[10px] uppercase tracking-wide">from</span>
            <input
              type="month"
              defaultValue={p.startMonth.slice(0, 7)}
              onBlur={(e) =>
                e.target.value && patchPeriod(p.id, { startMonth: `${e.target.value}-01` })
              }
              className="min-w-0 flex-1 rounded border border-zinc-300 px-1 py-0.5 text-zinc-900"
            />
          </label>
          <label className="flex items-center gap-1.5 text-zinc-400">
            <span className="w-7 shrink-0 text-[10px] uppercase tracking-wide">to</span>
            <input
              type="month"
              defaultValue={p.endMonth ? p.endMonth.slice(0, 7) : ''}
              onBlur={(e) =>
                patchPeriod(p.id, { endMonth: e.target.value ? `${e.target.value}-01` : null })
              }
              className="min-w-0 flex-1 rounded border border-zinc-300 px-1 py-0.5 text-zinc-900"
            />
          </label>
        </div>
      ))}
      <AddLink label="add period" onClick={addPeriod} />
    </div>
  );
}
