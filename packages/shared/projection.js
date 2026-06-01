const MONTH_LABELS = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
];

const pad2 = (n) => String(n).padStart(2, '0');
const monthKey = (year, month1to12) => `${year}-${pad2(month1to12)}-01`;

// period active in month key `m` (all keys share the 'YYYY-MM-01' format → string compare is safe)
const isActive = (period, m) =>
  period.startMonth <= m && (period.endMonth == null || m <= period.endMonth);

const amountOf = (flow, m) => {
  const p = flow.periods.find((x) => isActive(x, m));
  return p ? p.amountMinor : 0;
};

/**
 * Compute the per-month budget projection from a snapshot.
 *
 * Input contract (enforced upstream by the oRPC/Zod layer; not re-validated here):
 * - `settings.startMonth` and all period/event month fields are full first-of-month
 *   ISO strings, 'YYYY-MM-01'. The fixed format is what makes lexicographic string
 *   comparison valid for the active-period checks below.
 * - Periods within a single flow do not overlap (the flows service auto-closes the
 *   previous open period when a new one is added). If they ever did overlap, the
 *   first active period wins.
 */
export function computeProjection({ settings, flows, taxes, events }) {
  const startYear = Number(settings.startMonth.slice(0, 4));
  const startMonth0 = Number(settings.startMonth.slice(5, 7)) - 1; // 0-based
  const total = settings.horizonYears * 12;

  const incomeFlows = flows.filter((f) => f.kind === 'income');
  const spendFlows = flows.filter((f) => f.kind === 'spending');
  const sortByPos = (a, b) => a.position - b.position || a.id - b.id;
  const sortedTaxes = [...taxes].sort(sortByPos);
  const sortedSpend = [...spendFlows].sort(sortByPos);

  const months = [];
  let cumulative = settings.startingSavingsMinor;

  for (let i = 0; i < total; i++) {
    const year = startYear + Math.floor((startMonth0 + i) / 12);
    const month1 = ((startMonth0 + i) % 12) + 1;
    const m = monthKey(year, month1);

    const income = incomeFlows.reduce((sum, f) => sum + amountOf(f, m), 0);

    const taxBreakdown = sortedTaxes.map((t) => ({
      id: t.id,
      name: t.name,
      color: t.color,
      amount:
        t.mode === 'percent'
          ? Math.round((income * (t.rateBps ?? 0)) / 10000)
          : (t.amountMinor ?? 0),
    }));
    const totalTax = taxBreakdown.reduce((s, t) => s + t.amount, 0);

    const spendBreakdown = sortedSpend.map((f) => ({
      id: f.id,
      name: f.name,
      color: f.color,
      amount: amountOf(f, m),
    }));
    const totalSpend = spendBreakdown.reduce((s, x) => s + x.amount, 0);

    const monthEvents = events
      .filter((e) => e.month === m)
      .map((e) => ({ id: e.id, name: e.name, color: e.color, amount: e.amountMinor }));
    const totalEvents = monthEvents.reduce((s, e) => s + e.amount, 0);

    const leftover = income - totalTax - totalSpend;
    cumulative = cumulative + leftover - totalEvents;

    months.push({
      monthIndex: i,
      label: MONTH_LABELS[month1 - 1],
      year,
      isYearStart: month1 === 1 || i === 0,
      income,
      taxBreakdown,
      spendBreakdown,
      leftover,
      cumulative,
      events: monthEvents,
    });
  }

  return { months };
}
