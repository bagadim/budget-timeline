import type { NextConfig } from 'next';

const config: NextConfig = {
  async rewrites() {
    return [
      {
        source: '/rpc/:path*',
        destination: 'http://localhost:3001/rpc/:path*',
      },
    ];
  },
};

export default config;
