import { createORPCClient } from '@orpc/client';
import { RPCLink } from '@orpc/client/fetch';
import type { RouterClient } from '@orpc/server';
import type { Router } from '@budget-timeline/core';

const link = new RPCLink({
  url:
    typeof window === 'undefined'
      ? 'http://localhost:3001/rpc'
      : '/rpc',
});

export const client: RouterClient<Router> = createORPCClient(link);
