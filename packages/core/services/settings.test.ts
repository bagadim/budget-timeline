import { describe, expect, it } from 'vitest';
import { makeTestDb } from '../test-helpers';
import { getSettings, updateSettings } from './settings';

describe('settings service', () => {
  it('returns a seeded default singleton on first read', () => {
    const db = makeTestDb();
    const s = getSettings(db);
    expect(s).toMatchObject({ id: 1, currency: 'PLN', horizonYears: 5, startingSavingsMinor: 0 });
    expect(s.startMonth).toMatch(/^\d{4}-\d{2}-01$/);
  });

  it('updates and persists fields', () => {
    const db = makeTestDb();
    getSettings(db); // seed
    const updated = updateSettings(db, {
      currency: 'EUR',
      horizonYears: 10,
      startingSavingsMinor: 999,
    });
    expect(updated).toMatchObject({ currency: 'EUR', horizonYears: 10, startingSavingsMinor: 999 });
    expect(getSettings(db).currency).toBe('EUR');
  });
});
