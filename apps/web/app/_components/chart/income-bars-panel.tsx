import { displayMoney } from '@budget-timeline/shared/money';
import type { ProjectionMonth } from '@budget-timeline/shared/projection';
import { SAVINGS_GREEN } from '@/lib/palette';
import {
  COL,
  chartWidth,
  colX,
  GAP,
  HoverLine,
  indexFromX,
  YEAR_BAND,
  YearBoundaries,
} from './chart-grid';

const HEIGHT = 220;
const TOP = YEAR_BAND + 6;

export function IncomeBarsPanel({
  months,
  maxIncome,
  currency,
  hover,
  onHover,
}: {
  months: ProjectionMonth[];
  maxIncome: number;
  currency: string;
  hover: number | null;
  onHover: (i: number | null) => void;
}) {
  const plotH = HEIGHT - TOP - 18;
  const scale = (v: number) => (maxIncome > 0 ? (v / maxIncome) * plotH : 0);
  const bw = COL - GAP;
  const width = chartWidth(months.length);

  return (
    <svg
      width={width}
      height={HEIGHT}
      className="block"
      role="img"
      aria-label="Income breakdown chart"
      onPointerMove={(e) => {
        const left = e.currentTarget.getBoundingClientRect().left;
        onHover(indexFromX(e.clientX - left, months.length));
      }}
      onPointerLeave={() => onHover(null)}
    >
      <YearBoundaries months={months} height={HEIGHT} />
      <text
        x={2}
        y={TOP - 3}
        fontSize={8}
        fill="#94a3b8"
        paintOrder="stroke"
        stroke="#fff"
        strokeWidth={2.5}
      >
        {displayMoney(maxIncome, currency)}
      </text>
      <line x1={0} y1={TOP + plotH} x2={width} y2={TOP + plotH} stroke="#94a3b8" />
      {months.map((m, i) => {
        const x = colX(i);
        let acc = 0;
        const segs = [
          ...m.taxBreakdown.map((s) => ({ ...s, kind: 'tax' as const })),
          ...m.spendBreakdown.map((s) => ({ ...s, kind: 'spend' as const })),
        ];
        const rects = segs.map((s) => {
          const h = scale(s.amount);
          const yy = TOP + plotH - acc - h;
          acc += h;
          return (
            <rect
              key={`${m.monthIndex}-${s.kind}-${s.id}`}
              x={x}
              y={yy}
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
            {m.isYearStart && m.income > 0 && leftoverH > 16 && (
              <text
                x={x + bw / 2}
                y={leftoverY + 12}
                fontSize={9}
                fontWeight={700}
                fill="#fff"
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
      <HoverLine index={hover} height={HEIGHT} />
    </svg>
  );
}
