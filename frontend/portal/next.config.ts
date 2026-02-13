import type { NextConfig } from "next";
import path from 'path';

const nextConfig: NextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  output: 'standalone',
  experimental: {
    externalDir: true,
  },
  turbopack: {
    resolveAlias: {
      '@shared': path.resolve(__dirname, '../shared'),
    },
  },
  webpack: (config) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      '@shared': path.resolve(__dirname, '../shared'),
    };
    return config;
  },
  async rewrites() {
    // Server-side rewrite uses INTERNAL_API_URL (Docker DNS) for container-to-container,
    // falls back to NEXT_PUBLIC_API_URL for local dev, then to Docker DNS default
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
