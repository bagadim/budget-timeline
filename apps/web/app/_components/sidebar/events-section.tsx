'use client';

import type { useBudget } from '../use-budget';
import { nextColor, PALETTE } from '@/lib/palette';
import { AddLink } from './add-link';
import { ColorSwatch } from './color-swatch';

export function EventsSection({ budget }: { budget: ReturnType<typeof useBudget> }) {
  const { snapshot, persist, client, reload } = budget;
  const events = snapshot.events;

  const add = () => {
    const color = nextColor(PALETTE, snapshot.flows.length + events.length);
    persist(
      (cur) => cur,
      async () => {
        await client.events.create({ name: 'New event', month: snapshot.settings.startMonth, amountMinor: 0, color });
        await reload();
      },
    );
  };

  const patch = (id: number, p: Partial<(typeof events)[number]>) =>
    persist(
      (cur) => ({ ...cur, events: cur.events.map((e) => (e.id === id ? { ...e, ...p } : e)) }),
      () => client.events.update({ id, ...p }),
    );

  const remove = (id: number) =>
    persist(
      (cur) => ({ ...cur, events: cur.events.filter((e) => e.id !== id) }),
      () => client.events.delete({ id }),
    );

  return (
    <section className="rounded-lg border border-zinc-200 bg-white p-3">
      <h2 className="mb-2 font-semibold">Events</h2>
      <div className="space-y-1.5">
        {events.map((e) => (
          <div key={e.id} className="flex items-center gap-1.5 rounded border border-zinc-200 p-1.5">
            <ColorSwatch color={e.color ?? PALETTE[0]} onChange={(c) => patch(e.id, { color: c })} />
            <input
              defaultValue={e.name}
              onBlur={(ev) => patch(e.id, { name: ev.target.value })}
              className="min-w-0 flex-1 rounded border border-transparent px-1 py-0.5 text-sm text-zinc-900 hover:border-zinc-200"
            />
            <input
              type="month"
              defaultValue={e.month.slice(0, 7)}
              onBlur={(ev) => ev.target.value && patch(e.id, { month: `${ev.target.value}-01` })}
              className="rounded border border-zinc-300 px-1 py-0.5 text-xs text-zinc-900"
            />
            <input
              type="number"
              defaultValue={e.amountMinor / 100}
              onBlur={(ev) => patch(e.id, { amountMinor: Math.round(Number(ev.target.value) * 100) })}
              className="w-16 rounded border border-zinc-300 px-1 py-0.5 text-xs text-zinc-900"
            />
            <button type="button" onClick={() => remove(e.id)} className="text-zinc-400 hover:text-red-600">
              ✕
            </button>
          </div>
        ))}
      </div>
      <AddLink label="add event" onClick={add} />
    </section>
  );
}
