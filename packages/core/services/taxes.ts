import { type Db, type Tax, taxes } from '@budget-timeline/db';
import { asc, eq } from 'drizzle-orm';

export function listTaxes(db: Db): Tax[] {
  return db.select().from(taxes).orderBy(asc(taxes.position), asc(taxes.id)).all();
}

export function createTax(
  db: Db,
  input: {
    name: string;
    mode: 'percent' | 'fixed';
    rateBps: number | null;
    amountMinor: number | null;
    color: string;
    position: number;
  },
): Tax {
  return db.insert(taxes).values(input).returning().get();
}

export function updateTax(
  db: Db,
  patch: {
    id: number;
    name?: string;
    mode?: 'percent' | 'fixed';
    rateBps?: number | null;
    amountMinor?: number | null;
    color?: string;
    position?: number;
  },
): void {
  const { id, ...rest } = patch;
  db.update(taxes).set(rest).where(eq(taxes.id, id)).run();
}

export function deleteTax(db: Db, id: number): void {
  db.delete(taxes).where(eq(taxes.id, id)).run();
}
