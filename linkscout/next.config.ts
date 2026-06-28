import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      // Clearbit company logos
      { protocol: "https", hostname: "logo.clearbit.com" },
      // UI Avatars fallback
      { protocol: "https", hostname: "ui-avatars.com" },
      // Generic CDN patterns
      { protocol: "https", hostname: "*.licdn.com" },
      { protocol: "https", hostname: "media.licdn.com" },
    ],
  },

  // Suppress pdfjs-dist canvas warning (unused dep, kept for now)
  webpack: (config) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      canvas: false,
    };
    return config;
  },
};

export default nextConfig;
