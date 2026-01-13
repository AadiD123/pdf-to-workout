import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Enable React strict mode for better error catching
  reactStrictMode: true,

  // Optimize images
  images: {
    formats: ['image/webp', 'image/avif'],
  },

  // Production optimizations
  poweredByHeader: false,
  compress: true,

  // Turbopack configuration (Next.js 16+)
  turbopack: {
    // Empty config to silence webpack warning
  },

  // Webpack configuration for PDF.js (fallback for non-Turbopack builds)
  webpack: (config) => {
    config.resolve.alias.canvas = false;
    config.resolve.alias.encoding = false;
    return config;
  },
};

export default nextConfig;
