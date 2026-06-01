import type { ProjectionMonth } from '@budget-timeline/shared/projection';
import { SAVINGS_GREEN } from '@/lib/palette';
import { COL, GAP, YearBoundaries, chartWidth, colX } from './chart-grid';

const HEIGHT = 130;
const TOP = 10;

export function SavingsPanel({ months }: { months: ProjectionMonth[] }) {
  const plotH = HEIGHT - TOP - 10;
  const values = months.map((m) => m.cumulative);
  const max = Math.max(1, ...values);
  const min = Math.min(0, ...values);
  const y = (v: number) => TOP + plotH - ((v - min) / (max - min)) * plotH;
  const cx = (i: number) => colX(i) + (COL - GAP) / 2;

  const line = months.map((m, i) => `${i ? 'L' : 'M'}${cx(i)} ${y(m.cumulative)}`).join('');
  const area = `${line}L${cx(months.length - 1)} ${TOP + plotH}L${cx(0)} ${TOP + plotH}Z`;

  return (
    <svg width={chartWidth(months.length)} height={HEIGHT} className="block">
      <YearBoundaries months={months} height={HEIGHT} />
      <line x1={0} y1={y(0)} x2={chartWidth(months.length)} y2={y(0)} stroke="#e5e7eb" />
      <path d={area} fill={`${SAVINGS_GREEN}22`} />
      <path d={line} fill="none" stroke="#0f172a" strokeWidth={2} />
      {months.map((m, i) =>
        m.events.map((e) => (
          <g key={`${m.monthIndex}-${e.id}`}>
            <line x1={cx(i)} y1={y(months[i - 1]?.cumulative ?? m.cumulative + e.amount)} x2={cx(i)} y2={y(m.cumulative)} stroke={e.color ?? '#dc2626'} strokeWidth={2} />
            <circle cx={cx(i)} cy={y(m.cumulative)} r={3.5} fill="#fff" stroke={e.color ?? '#dc2626'} strokeWidth={2} />
            <text x={cx(i) + 5} y={y(m.cumulative) - 4} fontSize={9} fontWeight={700} fill={e.color ?? '#dc2626'}>
              {e.name}
            </text>
          </g>
        )),
      )}
    </svg>
  );
}
