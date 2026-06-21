import { displayMoney } from '@budget-timeline/shared/money';
import type { ProjectionMonth } from '@budget-timeline/shared/projection';
import { SAVINGS_GREEN } from '@/lib/palette';
import { chartWidth, cx, HoverLine, indexFromX, YEAR_BAND, YearBoundaries } from './chart-grid';

const HEIGHT = 130;
const TOP = YEAR_BAND + 4;

export function SavingsPanel({
  months,
  currency,
  hover,
  onHover,
}: {
  months: ProjectionMonth[];
  currency: string;
  hover: number | null;
  onHover: (i: number | null) => void;
}) {
  const plotH = HEIGHT - TOP - 10;
  const values = months.map((m) => m.cumulative);
  const max = Math.max(1, ...values);
  const min = Math.min(0, ...values);
  const y = (v: number) => TOP + plotH - ((v - min) / (max - min)) * plotH;
  const width = chartWidth(months.length);

  const line = months.map((m, i) => `${i ? 'L' : 'M'}${cx(i)} ${y(m.cumulative)}`).join('');
  const area = `${line}L${cx(months.length - 1)} ${TOP + plotH}L${cx(0)} ${TOP + plotH}Z`;

  const topTicks = min < 0 ? [max, min] : [max];

  const hovered = hover != null ? months[hover] : null;

  return (
    <svg
      width={width}
      height={HEIGHT}
      className="block"
      role="img"
      aria-label="Savings over time chart"
      onPointerMove={(e) => {
        const left = e.currentTarget.getBoundingClientRect().left;
        onHover(indexFromX(e.clientX - left, months.length));
      }}
      onPointerLeave={() => onHover(null)}
    >
      <YearBoundaries months={months} height={HEIGHT} />
      {topTicks.map((v, idx) => (
        <g key={v}>
          <line x1={0} y1={y(v)} x2={width} y2={y(v)} stroke="#eef2f6" />
          {/* topmost (max) label drops below its line to clear the year band */}
          <text
            x={2}
            y={idx === 0 ? y(v) + 9 : y(v) - 3}
            fontSize={8}
            fill="#94a3b8"
            paintOrder="stroke"
            stroke="#fff"
            strokeWidth={2.5}
          >
            {displayMoney(v, currency)}
          </text>
        </g>
      ))}
      <line x1={0} y1={y(0)} x2={width} y2={y(0)} stroke="#e5e7eb" />
      <text
        x={2}
        y={y(0) - 3}
        fontSize={8}
        fill="#94a3b8"
        paintOrder="stroke"
        stroke="#fff"
        strokeWidth={2.5}
      >
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
      <HoverLine index={hover} height={HEIGHT} />
      {hovered != null && hover != null && (
        <HoverReadout
          x={cx(hover)}
          y={y(hovered.cumulative)}
          width={width}
          label={`${hovered.label} ${hovered.year}`}
          value={displayMoney(hovered.cumulative, currency)}
        />
      )}
    </svg>
  );
}

/** Crosshair dot on the savings curve + a pill showing that month's cumulative value. */
function HoverReadout({
  x,
  y,
  width,
  label,
  value,
}: {
  x: number;
  y: number;
  width: number;
  label: string;
  value: string;
}) {
  const text = `${label} · ${value}`;
  const pillW = text.length * 6 + 16;
  const pillH = 18;
  // Prefer above the point; flip below if it would clip the top band.
  const above = y - pillH - 8 >= YEAR_BAND;
  const py = above ? y - pillH - 8 : y + 8;
  const px = Math.max(2, Math.min(width - pillW - 2, x - pillW / 2));
  return (
    <g pointerEvents="none">
      <circle cx={x} cy={y} r={4} fill="#fff" stroke="#0f172a" strokeWidth={2} />
      <rect x={px} y={py} width={pillW} height={pillH} rx={5} fill="#0f172a" />
      <text
        x={px + pillW / 2}
        y={py + 13}
        fontSize={10}
        fontWeight={600}
        fill="#fff"
        textAnchor="middle"
      >
        {text}
      </text>
    </g>
  );
}
