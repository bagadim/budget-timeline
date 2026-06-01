import { type Db, type Settings, settings } from '@budget-timeline/db';
import { eq } from 'drizzle-orm';

const defaultStartMonth = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
};

export function getSettings(db: Db): Settings {
  const existing = db.select().from(settings).where(eq(settings.id, 1)).get();
  if (existing) return existing;
  return db
    .insert(settings)
    .values({
      id: 1,
      startingSavingsMinor: 0,
      startMonth: defaultStartMonth(),
      currency: 'PLN',
      horizonYears: 5,
    })
    .returning()
    .get();
}

export function updateSettings(
  db: Db,
  patch: Partial<
    Pick<Settings, 'startingSavingsMinor' | 'startMonth' | 'currency' | 'horizonYears'>
  >,
): Settings {
  getSettings(db); // ensure the row exists
  return db.update(settings).set(patch).where(eq(settings.id, 1)).returning().get();
}
