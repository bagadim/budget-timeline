import { type Db, type EventRow, events } from '@budget-timeline/db';
import { asc, eq } from 'drizzle-orm';

export function listEvents(db: Db): EventRow[] {
  return db.select().from(events).orderBy(asc(events.month), asc(events.id)).all();
}

export function createEvent(
  db: Db,
  input: { name: string; month: string; amountMinor: number; color: string | null },
): EventRow {
  return db.insert(events).values(input).returning().get();
}

export function updateEvent(
  db: Db,
  patch: { id: number; name?: string; month?: string; amountMinor?: number; color?: string | null },
): void {
  const { id, ...rest } = patch;
  db.update(events).set(rest).where(eq(events.id, id)).run();
}

export function deleteEvent(db: Db, id: number): void {
  db.delete(events).where(eq(events.id, id)).run();
}
