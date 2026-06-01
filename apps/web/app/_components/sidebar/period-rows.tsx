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
    <div className="mt-1.5 space-y-1.5 border-l-2 border-zinc-100 pl-2">
      {flow.periods.map((p) => (
        <div key={p.id} className="flex items-center gap-1.5 text-xs">
          <input
            type="number"
            defaultValue={p.amountMinor / 100}
            onBlur={(e) =>
              patchPeriod(p.id, { amountMinor: Math.round(Number(e.target.value) * 100) })
            }
            className="w-16 rounded border border-zinc-300 px-1 py-0.5 text-zinc-900"
          />
          <input
            type="month"
            defaultValue={p.startMonth.slice(0, 7)}
            onBlur={(e) =>
              e.target.value && patchPeriod(p.id, { startMonth: `${e.target.value}-01` })
            }
            className="rounded border border-zinc-300 px-1 py-0.5 text-zinc-900"
          />
          <span className="text-zinc-400">→</span>
          <input
            type="month"
            defaultValue={p.endMonth ? p.endMonth.slice(0, 7) : ''}
            onBlur={(e) =>
              patchPeriod(p.id, { endMonth: e.target.value ? `${e.target.value}-01` : null })
            }
            className="rounded border border-zinc-300 px-1 py-0.5 text-zinc-900"
          />
          {flow.periods.length > 1 && (
            <button
              type="button"
              onClick={() => removePeriod(p.id)}
              className="text-zinc-400 hover:text-red-600"
            >
              ✕
            </button>
          )}
        </div>
      ))}
      <AddLink label="add period" onClick={addPeriod} />
    </div>
  );
}
