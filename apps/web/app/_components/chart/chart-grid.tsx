import type { ProjectionMonth } from '@budget-timeline/shared/projection';

export const COL = 34;
export const GAP = 10;
export const PAD_L = 8;
export const chartWidth = (n: number) => PAD_L + n * COL + 8;
export const colX = (i: number) => PAD_L + i * COL;

/** Dashed vertical lines + year labels at each January (and the first month). */
export function YearBoundaries({ months, height }: { months: ProjectionMonth[]; height: number }) {
  return (
    <>
      {months.map((m, i) =>
        m.isYearStart ? (
          <g key={m.monthIndex}>
            <line x1={colX(i) - GAP / 2} y1={0} x2={colX(i) - GAP / 2} y2={height} stroke="#cbd5e1" strokeDasharray="3 3" />
            <text x={colX(i) - GAP / 2 + 3} y={11} fontSize={10} fontWeight={600} fill="#475569">
              {m.year}
            </text>
          </g>
        ) : null,
      )}
    </>
  );
}
