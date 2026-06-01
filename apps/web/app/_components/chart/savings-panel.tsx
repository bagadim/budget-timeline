import { displayMoney } from '@budget-timeline/shared/money';
import type { ProjectionMonth } from '@budget-timeline/shared/projection';
import { SAVINGS_GREEN } from '@/lib/palette';
import { COL, chartWidth, colX, GAP, YearBoundaries } from './chart-grid';

const HEIGHT = 130;
const TOP = 10;

export function SavingsPanel({
  months,
  currency,
}: {
  months: ProjectionMonth[];
  currency: string;
}) {
  const plotH = HEIGHT - TOP - 10;
  const values = months.map((m) => m.cumulative);
  const max = Math.max(1, ...values);
  const min = Math.min(0, ...values);
  const y = (v: number) => TOP + plotH - ((v - min) / (max - min)) * plotH;
  const cx = (i: number) => colX(i) + (COL - GAP) / 2;
  const width = chartWidth(months.length);

  const line = months.map((m, i) => `${i ? 'L' : 'M'}${cx(i)} ${y(m.cumulative)}`).join('');
  const area = `${line}L${cx(months.length - 1)} ${TOP + plotH}L${cx(0)} ${TOP + plotH}Z`;

  const topTicks = min < 0 ? [max, min] : [max];

  return (
    <svg
      width={width}
      height={HEIGHT}
      className="block"
      role="img"
      aria-label="Savings over time chart"
    >
      <YearBoundaries months={months} height={HEIGHT} />
      {topTicks.map((v) => (
        <g key={v}>
          <line x1={0} y1={y(v)} x2={width} y2={y(v)} stroke="#eef2f6" />
          <text x={2} y={y(v) - 2} fontSize={8} fill="#94a3b8">
            {displayMoney(v, currency)}
          </text>
        </g>
      ))}
      <line x1={0} y1={y(0)} x2={width} y2={y(0)} stroke="#e5e7eb" />
      <text x={2} y={y(0) - 2} fontSize={8} fill="#94a3b8">
        {displayMoney(0, currency)}
      </text>
      <path d={area} fill={`${SAVINGS_GREEN}22`} />
      <path d={line} fill="none" stroke="#0f172a" strokeWidth={2} />
      {months.map((m, i) =>
        m.events.map((e) => (
          <g key={`${m.monthIndex}-${e.id}`}>
            <line
              x1={cx(i)}
              y1={y(months[i - 1]?.cumulative ?? m.cumulative + e.amount)}
              x2={cx(i)}
              y2={y(m.cumulative)}
              stroke={e.color ?? '#dc2626'}
              strokeWidth={2}
            />
            <circle
              cx={cx(i)}
              cy={y(m.cumulative)}
              r={3.5}
              fill="#fff"
              stroke={e.color ?? '#dc2626'}
              strokeWidth={2}
            />
            <text
              x={cx(i) + 5}
              y={y(m.cumulative) - 4}
              fontSize={9}
              fontWeight={700}
              fill={e.color ?? '#dc2626'}
            >
              {e.name} {displayMoney(-e.amount, currency)}
            </text>
          </g>
        )),
      )}
    </svg>
  );
}
