import { router } from '@budget-timeline/core';
import { RPCHandler } from '@orpc/server/fastify';
import Fastify from 'fastify';

const rpcHandler = new RPCHandler(router);
const fastify = Fastify({ logger: true });

fastify.addContentTypeParser('*', (_req, _payload, done) => done(null, undefined));

fastify.all('/rpc/*', async (req, reply) => {
  const { matched } = await rpcHandler.handle(req, reply, { prefix: '/rpc' });
  if (!matched) {
    reply.status(404).send('Not found');
  }
});

const port = Number(process.env.PORT ?? 4001);
await fastify.listen({ port });
