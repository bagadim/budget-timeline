import type { Router } from '@budget-timeline/core';
import { createORPCClient } from '@orpc/client';
import { RPCLink } from '@orpc/client/fetch';
import type { RouterClient } from '@orpc/server';

const link = new RPCLink({
  url: typeof window === 'undefined' ? 'http://localhost:4001/rpc' : '/rpc',
});

export const client: RouterClient<Router> = createORPCClient(link);
