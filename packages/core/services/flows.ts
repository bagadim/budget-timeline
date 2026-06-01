import { type Db, flowPeriods, flows } from '@budget-timeline/db';
import { asc, eq } from 'drizzle-orm';
import type { FlowWithPeriods } from '../types';

// previous-month key for 'YYYY-MM-01'
const prevMonth = (m: string): string => {
  const y = Number(m.slice(0, 4));
  const mo = Number(m.slice(5, 7));
  const py = mo === 1 ? y - 1 : y;
  const pm = mo === 1 ? 12 : mo - 1;
  return `${py}-${String(pm).padStart(2, '0')}-01`;
};

export function listFlows(db: Db): FlowWithPeriods[] {
  const allFlows = db.select().from(flows).orderBy(asc(flows.position), asc(flows.id)).all();
  const allPeriods = db.select().from(flowPeriods).orderBy(asc(flowPeriods.startMonth)).all();
  return allFlows.map((f) => ({ ...f, periods: allPeriods.filter((p) => p.flowId === f.id) }));
}

export function createFlow(
  db: Db,
  input: { kind: 'income' | 'spending'; name: string; color: string; position: number; startMonth: string },
): FlowWithPeriods {
  const flow = db
    .insert(flows)
    .values({ kind: input.kind, name: input.name, color: input.color, position: input.position })
    .returning()
    .get();
  db.insert(flowPeriods).values({ flowId: flow.id, amountMinor: 0, startMonth: input.startMonth, endMonth: null }).run();
  return listFlows(db).find((f) => f.id === flow.id) as FlowWithPeriods;
}

export function updateFlow(
  db: Db,
  patch: { id: number; name?: string; color?: string; position?: number },
): void {
  const { id, ...rest } = patch;
  db.update(flows).set(rest).where(eq(flows.id, id)).run();
}

export function deleteFlow(db: Db, id: number): void {
  db.delete(flows).where(eq(flows.id, id)).run();
}

export function addPeriod(
  db: Db,
  input: { flowId: number; amountMinor: number; startMonth: string; endMonth?: string | null },
): void {
  // auto-close any open (endMonth null) period that starts before this one
  const open = db
    .select()
    .from(flowPeriods)
    .where(eq(flowPeriods.flowId, input.flowId))
    .all()
    .filter((p) => p.endMonth == null && p.startMonth < input.startMonth);
  for (const p of open) {
    db.update(flowPeriods).set({ endMonth: prevMonth(input.startMonth) }).where(eq(flowPeriods.id, p.id)).run();
  }
  db.insert(flowPeriods)
    .values({ flowId: input.flowId, amountMinor: input.amountMinor, startMonth: input.startMonth, endMonth: input.endMonth ?? null })
    .run();
}

export function updatePeriod(
  db: Db,
  patch: { id: number; amountMinor?: number; startMonth?: string; endMonth?: string | null },
): void {
  const { id, ...rest } = patch;
  db.update(flowPeriods).set(rest).where(eq(flowPeriods.id, id)).run();
}

export function deletePeriod(db: Db, id: number): void {
  db.delete(flowPeriods).where(eq(flowPeriods.id, id)).run();
}
