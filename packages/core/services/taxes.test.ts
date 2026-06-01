import { describe, expect, it } from 'vitest';
import { makeTestDb } from '../test-helpers';
import { createTax, deleteTax, listTaxes, updateTax } from './taxes';

describe('taxes service', () => {
  it('creates, lists, updates, and deletes taxes', () => {
    const db = makeTestDb();
    const tax = createTax(db, { name: 'Income', mode: 'percent', rateBps: 1200, amountMinor: null, color: '#ef4444', position: 0 });
    expect(tax).toMatchObject({ name: 'Income', mode: 'percent', rateBps: 1200 });

    expect(listTaxes(db)).toHaveLength(1);

    updateTax(db, { id: tax.id, mode: 'fixed', rateBps: null, amountMinor: 50_000 });
    expect(listTaxes(db)[0]).toMatchObject({ mode: 'fixed', amountMinor: 50_000 });

    deleteTax(db, tax.id);
    expect(listTaxes(db)).toHaveLength(0);
  });
});
