import { describe, expect, it } from 'vitest';
import { computeProjection } from './projection.js';

const base = {
  settings: {
    startingSavingsMinor: 1_500_000,
    startMonth: '2026-01-01',
    currency: 'PLN',
    horizonYears: 5,
  },
  flows: [],
  taxes: [],
  events: [],
};

const incomeFlow = (overrides = {}) => ({
  id: 1,
  kind: 'income',
  name: 'Salary',
  color: '#000',
  position: 0,
  periods: [{ id: 1, flowId: 1, amountMinor: 800_000, startMonth: '2026-01-01', endMonth: null }],
  ...overrides,
});

describe('computeProjection', () => {
  it('produces horizonYears * 12 months from startMonth', () => {
    const { months } = computeProjection(base);
    expect(months).toHaveLength(60);
    expect(months[0]).toMatchObject({ monthIndex: 0, label: 'Jan', year: 2026, isYearStart: true });
    expect(months[1]).toMatchObject({ label: 'Feb', year: 2026, isYearStart: false });
    expect(months[12]).toMatchObject({ label: 'Jan', year: 2027, isYearStart: true });
  });

  it('honors a 10-year horizon', () => {
    expect(
      computeProjection({ ...base, settings: { ...base.settings, horizonYears: 10 } }).months,
    ).toHaveLength(120);
  });

  it('sums multiple active income flows', () => {
    const flows = [
      incomeFlow(),
      incomeFlow({
        id: 2,
        name: 'Freelance',
        periods: [
          { id: 2, flowId: 2, amountMinor: 200_000, startMonth: '2026-01-01', endMonth: null },
        ],
      }),
    ];
    expect(computeProjection({ ...base, flows }).months[0].income).toBe(1_000_000);
  });

  it('activates a period only within its [start, end] window', () => {
    const flows = [
      incomeFlow({
        periods: [
          {
            id: 1,
            flowId: 1,
            amountMinor: 800_000,
            startMonth: '2026-03-01',
            endMonth: '2026-04-01',
          },
        ],
      }),
    ];
    const { months } = computeProjection({ ...base, flows });
    expect(months[1].income).toBe(0); // Feb
    expect(months[2].income).toBe(800_000); // Mar
    expect(months[3].income).toBe(800_000); // Apr
    expect(months[4].income).toBe(0); // May
  });

  it('applies percent and fixed taxes', () => {
    const flows = [incomeFlow()]; // 800_000 income
    const taxes = [
      {
        id: 1,
        name: 'Income',
        mode: 'percent',
        rateBps: 1200,
        amountMinor: null,
        color: '#f00',
        position: 0,
      },
      {
        id: 2,
        name: 'Social',
        mode: 'fixed',
        rateBps: null,
        amountMinor: 50_000,
        color: '#f80',
        position: 1,
      },
    ];
    const m = computeProjection({ ...base, flows, taxes }).months[0];
    expect(m.taxBreakdown).toEqual([
      { id: 1, name: 'Income', color: '#f00', amount: 96_000 }, // 12% of 800_000
      { id: 2, name: 'Social', color: '#f80', amount: 50_000 },
    ]);
  });

  it('computes leftover and a running cumulative', () => {
    const flows = [incomeFlow()]; // 800_000/mo
    const spend = {
      id: 9,
      kind: 'spending',
      name: 'Rent',
      color: '#00f',
      position: 0,
      periods: [
        { id: 9, flowId: 9, amountMinor: 300_000, startMonth: '2026-01-01', endMonth: null },
      ],
    };
    const { months } = computeProjection({ ...base, flows: [...flows, spend] });
    expect(months[0].leftover).toBe(500_000);
    expect(months[0].cumulative).toBe(1_500_000 + 500_000);
    expect(months[1].cumulative).toBe(1_500_000 + 1_000_000);
    expect(months[0].spendBreakdown).toEqual([
      { id: 9, name: 'Rent', color: '#00f', amount: 300_000 },
    ]);
  });

  it('subtracts events as one-time withdrawals at their month', () => {
    const flows = [incomeFlow()];
    const events = [
      { id: 1, name: 'Japan', month: '2026-02-01', amountMinor: 1_200_000, color: null },
    ];
    const { months } = computeProjection({ ...base, flows, events });
    expect(months[0].cumulative).toBe(2_300_000); // 1.5M + 0.8M
    expect(months[1].events).toEqual([{ id: 1, name: 'Japan', color: null, amount: 1_200_000 }]);
    expect(months[1].cumulative).toBe(2_300_000 + 800_000 - 1_200_000); // 1.9M
  });

  it('allows negative leftover on overspend without below-zero bar data', () => {
    const spend = {
      id: 9,
      kind: 'spending',
      name: 'Big',
      color: '#00f',
      position: 0,
      periods: [
        { id: 9, flowId: 9, amountMinor: 1_000_000, startMonth: '2026-01-01', endMonth: null },
      ],
    };
    const m = computeProjection({ ...base, flows: [incomeFlow(), spend] }).months[0];
    expect(m.leftover).toBe(-200_000); // 800k income - 1M spend
  });
});
