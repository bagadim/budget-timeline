import { settings } from '@budget-timeline/db';
import { describe, expect, it } from 'vitest';
import { makeTestDb } from './test-helpers';

describe('makeTestDb', () => {
  it('creates an empty migrated database', () => {
    const db = makeTestDb();
    expect(db.select().from(settings).all()).toEqual([]);
  });
});
