import { describe, expect, it } from 'vitest';
import { makeTestDb } from '../test-helpers';
import { createEvent, deleteEvent, listEvents, updateEvent } from './events';

describe('events service', () => {
  it('creates, lists, updates, and deletes events', () => {
    const db = makeTestDb();
    const ev = createEvent(db, {
      name: 'Japan',
      month: '2026-10-01',
      amountMinor: 1_200_000,
      color: null,
    });
    expect(ev).toMatchObject({ name: 'Japan', month: '2026-10-01', amountMinor: 1_200_000 });

    expect(listEvents(db)).toHaveLength(1);

    updateEvent(db, { id: ev.id, amountMinor: 1_500_000, color: '#ec4899' });
    expect(listEvents(db)[0]).toMatchObject({ amountMinor: 1_500_000, color: '#ec4899' });

    deleteEvent(db, ev.id);
    expect(listEvents(db)).toHaveLength(0);
  });
});
