import { describe, expect, it } from 'vitest';
import { makeTestDb } from '../test-helpers';
import { addPeriod, createFlow, deleteFlow, listFlows, updateFlow, updatePeriod } from './flows';

describe('flows service', () => {
  it('creates a flow with one default period', () => {
    const db = makeTestDb();
    const flow = createFlow(db, {
      kind: 'income',
      name: 'Salary',
      color: '#2563eb',
      position: 0,
      startMonth: '2026-01-01',
    });
    expect(flow).toMatchObject({ kind: 'income', name: 'Salary', color: '#2563eb' });
    expect(flow.periods).toHaveLength(1);
    expect(flow.periods[0]).toMatchObject({
      amountMinor: 0,
      startMonth: '2026-01-01',
      endMonth: null,
    });
  });

  it('lists flows with their periods', () => {
    const db = makeTestDb();
    createFlow(db, {
      kind: 'spending',
      name: 'Rent',
      color: '#00f',
      position: 0,
      startMonth: '2026-01-01',
    });
    const flows = listFlows(db);
    expect(flows).toHaveLength(1);
    expect(flows[0]?.periods).toHaveLength(1);
  });

  it('updates a flow and a period', () => {
    const db = makeTestDb();
    const flow = createFlow(db, {
      kind: 'spending',
      name: 'Rent',
      color: '#00f',
      position: 0,
      startMonth: '2026-01-01',
    });
    updateFlow(db, { id: flow.id, name: 'Apartment', color: '#111' });
    updatePeriod(db, { id: flow.periods[0]!.id, amountMinor: 200_000, endMonth: '2026-12-01' });
    const reloaded = listFlows(db)[0]!;
    expect(reloaded.name).toBe('Apartment');
    expect(reloaded.periods[0]).toMatchObject({ amountMinor: 200_000, endMonth: '2026-12-01' });
  });

  it('adds a period and closes the previous open one the month before', () => {
    const db = makeTestDb();
    const flow = createFlow(db, {
      kind: 'spending',
      name: 'Rent',
      color: '#00f',
      position: 0,
      startMonth: '2026-01-01',
    });
    addPeriod(db, { flowId: flow.id, amountMinor: 230_000, startMonth: '2028-01-01' });
    const periods = listFlows(db)[0]!.periods;
    expect(periods).toHaveLength(2);
    expect(periods[0]?.endMonth).toBe('2027-12-01'); // auto-closed
    expect(periods[1]).toMatchObject({
      amountMinor: 230_000,
      startMonth: '2028-01-01',
      endMonth: null,
    });
  });

  it('deletes a flow and cascades its periods', () => {
    const db = makeTestDb();
    const flow = createFlow(db, {
      kind: 'income',
      name: 'X',
      color: '#000',
      position: 0,
      startMonth: '2026-01-01',
    });
    deleteFlow(db, flow.id);
    expect(listFlows(db)).toHaveLength(0);
  });
});
