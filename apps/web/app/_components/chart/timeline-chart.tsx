'use client';

import { displayMoney } from '@budget-timeline/shared/money';
import type { Projection } from '@budget-timeline/shared/projection';
import { useState } from 'react';
import { IncomeBarsPanel } from './income-bars-panel';
import { SavingsPanel } from './savings-panel';

export function TimelineChart({
  projection,
  currency,
}: {
  projection: Projection;
  currency: string;
}) {
  const months = projection.months;
  const maxIncome = Math.max(1, ...months.map((m) => m.income));
  const endSavings = months.at(-1)?.cumulative ?? 0;
  const years = Math.round(months.length / 12);
  const [hover, setHover] = useState<number | null>(null);

  return (
    <div className="rounded-lg border border-zinc-200 bg-white">
      <div className="flex items-baseline justify-between border-b border-zinc-100 px-3 py-1.5">
        <span className="text-xs font-medium text-zinc-500">
          Income &amp; spending · cumulative savings
        </span>
        <span className="text-sm">
          <span className="text-zinc-500">
            Projected in {years} yr{years === 1 ? '' : 's'}:{' '}
          </span>
          <span className="font-semibold text-zinc-900">{displayMoney(endSavings, currency)}</span>
        </span>
      </div>
      <div className="overflow-x-auto">
        <div className="inline-block min-w-full">
          <div className="px-2 pt-1 text-xs font-medium text-zinc-500">Income &amp; spending</div>
          <IncomeBarsPanel
            months={months}
            maxIncome={maxIncome}
            currency={currency}
            hover={hover}
            onHover={setHover}
          />
          <div className="border-y border-zinc-100 px-2 pt-1 text-xs font-medium text-zinc-500">
            Cumulative savings
          </div>
          <SavingsPanel months={months} currency={currency} hover={hover} onHover={setHover} />
        </div>
      </div>
    </div>
  );
}
