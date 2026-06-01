import type { ProjectionMonth } from '@budget-timeline/shared/projection';
import { SAVINGS_GREEN } from '@/lib/palette';
import { COL, chartWidth, colX, GAP, YearBoundaries } from './chart-grid';

const HEIGHT = 220;
const TOP = 16;

export function IncomeBarsPanel({
  months,
  maxIncome,
}: {
  months: ProjectionMonth[];
  maxIncome: number;
}) {
  const plotH = HEIGHT - TOP - 18;
  const scale = (v: number) => (maxIncome > 0 ? (v / maxIncome) * plotH : 0);
  const bw = COL - GAP;

  return (
    <svg
      width={chartWidth(months.length)}
      height={HEIGHT}
      className="block"
      aria-label="Income breakdown chart"
      role="img"
    >
      <YearBoundaries months={months} height={HEIGHT} />
      <line
        x1={0}
        y1={TOP + plotH}
        x2={chartWidth(months.length)}
        y2={TOP + plotH}
        stroke="#94a3b8"
      />
      {months.map((m, i) => {
        const x = colX(i);
        let acc = 0;
        const segs = [
          ...m.taxBreakdown.map((s) => ({ ...s, kind: 'tax' as const })),
          ...m.spendBreakdown.map((s) => ({ ...s, kind: 'spend' as const })),
        ];
        const rects = segs.map((s) => {
          const h = scale(s.amount);
          const y = TOP + plotH - acc - h;
          acc += h;
          return (
            <rect
              key={`${m.monthIndex}-${s.kind}-${s.id}`}
              x={x}
              y={y}
              width={bw}
              height={Math.max(0, h)}
              fill={s.color ?? '#999'}
            />
          );
        });
        const leftoverH = m.leftover > 0 ? scale(m.leftover) : 0;
        const leftoverY = TOP + plotH - acc - leftoverH;
        const pct = m.income > 0 ? Math.round((m.leftover / m.income) * 100) : 0;
        return (
          <g key={m.monthIndex}>
            {rects}
            {leftoverH > 0 && (
              <rect x={x} y={leftoverY} width={bw} height={leftoverH} fill={SAVINGS_GREEN} rx={1} />
            )}
            {m.isYearStart && m.income > 0 && (
              <text
                x={x + bw / 2}
                y={leftoverY - 3}
                fontSize={9}
                fontWeight={700}
                fill={SAVINGS_GREEN}
                textAnchor="middle"
              >
                {pct}%
              </text>
            )}
            <text
              x={x + bw / 2}
              y={TOP + plotH + 13}
              fontSize={9}
              fill="#64748b"
              textAnchor="middle"
            >
              {m.label}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
