'use client';

import type { Snapshot } from '@budget-timeline/core/types';
import { computeProjection } from '@budget-timeline/shared/projection';
import { useCallback, useMemo, useState } from 'react';
import { client } from '@/lib/orpc';

export function useBudget(initial: Snapshot) {
  const [snapshot, setSnapshot] = useState<Snapshot>(initial);

  const projection = useMemo(() => computeProjection(snapshot), [snapshot]);

  const reload = useCallback(async () => {
    setSnapshot(await client.snapshot());
  }, []);

  // Optimistically patch local state, then persist; on error, reload from server.
  const persist = useCallback(
    async (mutate: (s: Snapshot) => Snapshot, call: () => Promise<unknown>) => {
      setSnapshot((s) => mutate(s));
      try {
        await call();
      } catch {
        await reload();
      }
    },
    [reload],
  );

  return { snapshot, setSnapshot, projection, reload, persist, client };
}
