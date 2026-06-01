'use client';

import { CURRENCIES } from '@/lib/palette';
import type { useBudget } from '../use-budget';

export function SetupSection({ budget }: { budget: ReturnType<typeof useBudget> }) {
  const { snapshot, persist, client } = budget;
  const s = snapshot.settings;

  // horizonYears is set via the chart toggle (its Zod type is 5|10), so it's excluded here.
  const update = (
    patch: Partial<Pick<typeof s, 'startingSavingsMinor' | 'startMonth' | 'currency'>>,
  ) =>
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
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </label>
      </div>
    </section>
  );
}
