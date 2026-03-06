import type { NextConfig } from "next";
import fs from 'fs';
import path from 'path';

const sharedDirCandidates = [
  path.resolve(__dirname, '../shared'),
  path.resolve(__dirname, './shared'),
];

const sharedDir = sharedDirCandidates.find((candidate) => fs.existsSync(candidate))
  || sharedDirCandidates[0];

const nextConfig: NextConfig = {
  output: "standalone",
  experimental: {
    externalDir: true,
  },
  webpack: (config) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      '@shared': sharedDir,
    };
    return config;
  },
  async rewrites() {
    const apiUrl = process.env.INTERNAL_API_URL
      || process.env.NEXT_PUBLIC_API_URL
      || 'http://api-gateway:8000';
    return [
      {
        source: '/api/:path*',
        destination: `${apiUrl}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;
