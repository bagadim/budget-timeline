'use client';

import { nextColor, TAX_PALETTE } from '@/lib/palette';
import type { useBudget } from '../use-budget';
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
        await client.taxes.create({
          name: 'New tax',
          mode: 'percent',
          rateBps: 0,
          amountMinor: null,
          color,
          position: taxes.length,
        });
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
          <div
            key={t.id}
            className="flex items-center gap-1.5 rounded border border-zinc-200 p-1.5"
          >
            <ColorSwatch
              color={t.color}
              options={TAX_PALETTE}
              onChange={(c) => patch(t.id, { color: c })}
            />
            <input
              defaultValue={t.name}
              onBlur={(e) => patch(t.id, { name: e.target.value })}
              className="min-w-0 flex-1 rounded border border-transparent px-1 py-0.5 text-sm text-zinc-900 hover:border-zinc-200"
            />
            <select
              value={t.mode}
              onChange={(e) =>
                patch(
                  t.id,
                  e.target.value === 'percent'
                    ? { mode: 'percent', amountMinor: null, rateBps: t.rateBps ?? 0 }
                    : { mode: 'fixed', rateBps: null, amountMinor: t.amountMinor ?? 0 },
                )
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
                onBlur={(e) =>
                  patch(t.id, { amountMinor: Math.round(Number(e.target.value) * 100) })
                }
                className="w-16 rounded border border-zinc-300 px-1 py-0.5 text-xs text-zinc-900"
              />
            )}
            <button
              type="button"
              onClick={() => remove(t.id)}
              className="text-zinc-400 hover:text-red-600"
            >
              ✕
            </button>
          </div>
        ))}
      </div>
      <AddLink label="add tax" onClick={add} />
    </section>
  );
}
