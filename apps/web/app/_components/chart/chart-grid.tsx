import type { ProjectionMonth } from '@budget-timeline/shared/projection';

export const COL = 34;
export const GAP = 10;
export const PAD_L = 8;
/** Top strip reserved exclusively for year labels, so they never collide with
 *  the value-axis labels or in-chart annotations below them. */
export const YEAR_BAND = 14;
export const chartWidth = (n: number) => PAD_L + n * COL + 8;
export const colX = (i: number) => PAD_L + i * COL;
/** x of a column's bar / data-point center */
export const cx = (i: number) => colX(i) + (COL - GAP) / 2;

/** Map a pointer x (relative to a panel's left edge) to the nearest month index. */
export function indexFromX(offsetX: number, count: number): number {
  const i = Math.round((offsetX - PAD_L - (COL - GAP) / 2) / COL);
  return Math.max(0, Math.min(count - 1, i));
}

/** Dashed vertical lines + year labels at each January (and the first month).
 *  Lines start below the year band so the year text sits in a clear strip. */
export function YearBoundaries({ months, height }: { months: ProjectionMonth[]; height: number }) {
  return (
    <>
      {months.map((m, i) =>
        m.isYearStart ? (
          <g key={m.monthIndex}>
            <line
              x1={colX(i) - GAP / 2}
              y1={YEAR_BAND}
              x2={colX(i) - GAP / 2}
              y2={height}
              stroke="#cbd5e1"
              strokeDasharray="3 3"
            />
            <text
              x={colX(i) - GAP / 2 + 4}
              y={10}
              fontSize={10}
              fontWeight={600}
              fill="#64748b"
              paintOrder="stroke"
              stroke="#fff"
              strokeWidth={3}
            >
              {m.year}
            </text>
          </g>
        ) : null,
      )}
    </>
  );
}

/** Vertical crosshair drawn at the hovered column. Shared across panels so the
 *  income bars and the savings curve stay visually linked on hover. */
export function HoverLine({ index, height }: { index: number | null; height: number }) {
  if (index == null) return null;
  return (
    <line
      x1={cx(index)}
      y1={YEAR_BAND}
      x2={cx(index)}
      y2={height}
      stroke="#475569"
      strokeWidth={1}
      pointerEvents="none"
    />
  );
}
