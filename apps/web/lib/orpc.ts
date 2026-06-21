import type { Router } from '@budget-timeline/core';
import { createORPCClient } from '@orpc/client';
import { RPCLink } from '@orpc/client/fetch';
import type { RouterClient } from '@orpc/server';

const link = new RPCLink({
  // oRPC's fetch RPCLink builds requests via `new URL(url)`, which requires an
  // absolute URL. On the server we hit the API directly; in the browser we go
  // through the current origin so Next's `/rpc/*` rewrite proxies to the API.
  url:
    typeof window === 'undefined' ? 'http://localhost:4001/rpc' : `${window.location.origin}/rpc`,
});

export const client: RouterClient<Router> = createORPCClient(link);
