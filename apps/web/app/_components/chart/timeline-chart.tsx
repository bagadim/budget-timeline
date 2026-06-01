'use client';

import type { Projection } from '@budget-timeline/shared/projection';
import { IncomeBarsPanel } from './income-bars-panel';
import { SavingsPanel } from './savings-panel';

export function TimelineChart({ projection }: { projection: Projection }) {
  const months = projection.months;
  const maxIncome = Math.max(1, ...months.map((m) => m.income));

  return (
    <div className="overflow-x-auto rounded-lg border border-zinc-200 bg-white">
      <div className="inline-block min-w-full">
        <div className="border-b border-zinc-100 px-2 pt-1 text-xs font-medium text-zinc-500">Income & spending</div>
        <IncomeBarsPanel months={months} maxIncome={maxIncome} />
        <div className="border-y border-zinc-100 px-2 pt-1 text-xs font-medium text-zinc-500">Cumulative savings</div>
        <SavingsPanel months={months} />
      </div>
    </div>
  );
}
