import path from 'node:path';
import type { NextConfig } from 'next';

const config: NextConfig = {
  // Pin the file-tracing root to the monorepo root so Next doesn't infer it
  // from a stray lockfile higher up the tree (e.g. ~/yarn.lock).
  outputFileTracingRoot: path.join(import.meta.dirname, '../..'),
  async rewrites() {
    return [
      {
        source: '/rpc/:path*',
        destination: 'http://localhost:4001/rpc/:path*',
      },
    ];
  },
};

export default config;
