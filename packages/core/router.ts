import { os } from '@orpc/server';
import { z } from 'zod';
import { db, milestones } from '@budget-timeline/db';

const list = os.handler(async () => {
  return db.select().from(milestones).all();
});

const create = os
  .input(
    z.object({
      name: z.string().min(1),
      targetCents: z.number().int().nonnegative(),
      targetDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    }),
  )
  .handler(async ({ input }) => {
    const [row] = await db.insert(milestones).values(input).returning();
    return row;
  });

export const router = {
  milestones: { list, create },
};

export type Router = typeof router;
