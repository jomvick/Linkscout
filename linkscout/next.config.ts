import type { NextConfig } from "next";
import { fileURLToPath } from "url";
import path from "path";
import createNextIntlPlugin from "next-intl/plugin";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const withNextIntl = createNextIntlPlugin("./i18n/request.ts");

const nextConfig: NextConfig = {
  outputFileTracingRoot: __dirname,

  images: {
    remotePatterns: [
      { protocol: "https", hostname: "logo.clearbit.com" },
      { protocol: "https", hostname: "ui-avatars.com" },
      { protocol: "https", hostname: "*.licdn.com" },
      { protocol: "https", hostname: "media.licdn.com" },
    ],
  },

  async rewrites() {
    return [
      {
        source: "/api/worker/:path*",
        destination: `${process.env.NEXT_PUBLIC_WORKER_URL || "https://linkscout-vfkm.onrender.com"}/:path*`,
      },
    ];
  },

  webpack: (config) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      canvas: false,
    };
    return config;
  },
};

export default withNextIntl(nextConfig);
