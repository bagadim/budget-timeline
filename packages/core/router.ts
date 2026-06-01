import { db } from '@budget-timeline/db';
import { os } from '@orpc/server';
import { z } from 'zod';
import * as eventsSvc from './services/events';
import * as flowsSvc from './services/flows';
import { getSettings, updateSettings } from './services/settings';
import { getSnapshot } from './services/snapshot';
import * as taxesSvc from './services/taxes';

const MONTH = z.string().regex(/^\d{4}-\d{2}-01$/);
const KIND = z.enum(['income', 'spending']);
const MODE = z.enum(['percent', 'fixed']);
const CURRENCY = z.enum(['PLN', 'USD', 'EUR', 'RUB']);
const MINOR = z.number().int().nonnegative();

// --- snapshot ---
const snapshot = os.handler(async () => getSnapshot(db));

// --- settings ---
const settingsGet = os.handler(async () => getSettings(db));
const settingsUpdate = os
  .input(
    z.object({
      startingSavingsMinor: MINOR.optional(),
      startMonth: MONTH.optional(),
      currency: CURRENCY.optional(),
      horizonYears: z.union([z.literal(5), z.literal(10)]).optional(),
    }),
  )
  .handler(async ({ input }) => updateSettings(db, input));

// --- flows ---
const flowsCreate = os
  .input(
    z.object({
      kind: KIND,
      name: z.string().min(1),
      color: z.string(),
      position: z.number().int(),
      startMonth: MONTH,
    }),
  )
  .handler(async ({ input }) => flowsSvc.createFlow(db, input));
const flowsUpdate = os
  .input(
    z.object({
      id: z.number().int(),
      name: z.string().min(1).optional(),
      color: z.string().optional(),
      position: z.number().int().optional(),
    }),
  )
  .handler(async ({ input }) => {
    flowsSvc.updateFlow(db, input);
    return { ok: true };
  });
const flowsDelete = os.input(z.object({ id: z.number().int() })).handler(async ({ input }) => {
  flowsSvc.deleteFlow(db, input.id);
  return { ok: true };
});
const periodAdd = os
  .input(
    z.object({
      flowId: z.number().int(),
      amountMinor: MINOR,
      startMonth: MONTH,
      endMonth: MONTH.nullable().optional(),
    }),
  )
  .handler(async ({ input }) => {
    flowsSvc.addPeriod(db, input);
    return { ok: true };
  });
const periodUpdate = os
  .input(
    z.object({
      id: z.number().int(),
      amountMinor: MINOR.optional(),
      startMonth: MONTH.optional(),
      endMonth: MONTH.nullable().optional(),
    }),
  )
  .handler(async ({ input }) => {
    flowsSvc.updatePeriod(db, input);
    return { ok: true };
  });
const periodDelete = os.input(z.object({ id: z.number().int() })).handler(async ({ input }) => {
  flowsSvc.deletePeriod(db, input.id);
  return { ok: true };
});

// --- taxes ---
const taxesCreate = os
  .input(
    z.object({
      name: z.string().min(1),
      mode: MODE,
      rateBps: z.number().int().min(0).max(10000).nullable(),
      amountMinor: MINOR.nullable(),
      color: z.string(),
      position: z.number().int(),
    }),
  )
  .handler(async ({ input }) => taxesSvc.createTax(db, input));
const taxesUpdate = os
  .input(
    z.object({
      id: z.number().int(),
      name: z.string().min(1).optional(),
      mode: MODE.optional(),
      rateBps: z.number().int().min(0).max(10000).nullable().optional(),
      amountMinor: MINOR.nullable().optional(),
      color: z.string().optional(),
      position: z.number().int().optional(),
    }),
  )
  .handler(async ({ input }) => {
    taxesSvc.updateTax(db, input);
    return { ok: true };
  });
const taxesDelete = os.input(z.object({ id: z.number().int() })).handler(async ({ input }) => {
  taxesSvc.deleteTax(db, input.id);
  return { ok: true };
});

// --- events ---
const eventsCreate = os
  .input(
    z.object({
      name: z.string().min(1),
      month: MONTH,
      amountMinor: MINOR,
      color: z.string().nullable(),
    }),
  )
  .handler(async ({ input }) => eventsSvc.createEvent(db, input));
const eventsUpdate = os
  .input(
    z.object({
      id: z.number().int(),
      name: z.string().min(1).optional(),
      month: MONTH.optional(),
      amountMinor: MINOR.optional(),
      color: z.string().nullable().optional(),
    }),
  )
  .handler(async ({ input }) => {
    eventsSvc.updateEvent(db, input);
    return { ok: true };
  });
const eventsDelete = os.input(z.object({ id: z.number().int() })).handler(async ({ input }) => {
  eventsSvc.deleteEvent(db, input.id);
  return { ok: true };
});

export const router = {
  snapshot,
  settings: { get: settingsGet, update: settingsUpdate },
  flows: {
    create: flowsCreate,
    update: flowsUpdate,
    delete: flowsDelete,
    periods: { add: periodAdd, update: periodUpdate, delete: periodDelete },
  },
  taxes: { create: taxesCreate, update: taxesUpdate, delete: taxesDelete },
  events: { create: eventsCreate, update: eventsUpdate, delete: eventsDelete },
};

export type Router = typeof router;
