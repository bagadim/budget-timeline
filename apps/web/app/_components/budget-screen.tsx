'use client';

import type { Snapshot } from '@budget-timeline/core/types';
import { useState } from 'react';
import { TimelineChart } from './chart/timeline-chart';
import { EventsSection } from './sidebar/events-section';
import { IncomeSection } from './sidebar/income-section';
import { SetupSection } from './sidebar/setup-section';
import { SpendingsSection } from './sidebar/spendings-section';
import { TaxesSection } from './sidebar/taxes-section';
import { useBudget } from './use-budget';

export function BudgetScreen({ initial }: { initial: Snapshot }) {
  const budget = useBudget(initial);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const { snapshot, persist, client } = budget;

  const setHorizon = (horizonYears: 5 | 10) =>
    persist(
      (cur) => ({ ...cur, settings: { ...cur.settings, horizonYears } }),
      () => client.settings.update({ horizonYears }),
    );

  return (
    <div className="flex h-screen overflow-hidden">
      {sidebarOpen && (
        <aside className="w-[300px] flex-none space-y-3 overflow-y-auto border-r border-zinc-200 bg-zinc-50 p-3">
          <div className="flex items-center justify-between">
            <h1 className="font-semibold">My Budget</h1>
            <button
              type="button"
              onClick={() => setSidebarOpen(false)}
              className="text-xs text-zinc-500"
            >
              ◀ collapse
            </button>
          </div>
          <SetupSection budget={budget} />
          <IncomeSection budget={budget} />
          <TaxesSection budget={budget} />
          <SpendingsSection budget={budget} />
          <EventsSection budget={budget} />
        </aside>
      )}
      <main className="flex-1 overflow-hidden p-4">
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            {!sidebarOpen && (
              <button
                type="button"
                onClick={() => setSidebarOpen(true)}
                className="text-xs text-zinc-500"
              >
                ▶ inputs
              </button>
            )}
            <h2 className="font-semibold">Timeline</h2>
          </div>
          <div className="flex overflow-hidden rounded-md border border-zinc-200 text-sm">
            {([5, 10] as const).map((y) => (
              <button
                key={y}
                type="button"
                onClick={() => setHorizon(y)}
                className={
                  snapshot.settings.horizonYears === y
                    ? 'bg-blue-600 px-3 py-1 text-white'
                    : 'px-3 py-1 text-zinc-600'
                }
              >
                {y} yrs
              </button>
            ))}
          </div>
        </div>
        <TimelineChart projection={budget.projection} />
      </main>
    </div>
  );
}
