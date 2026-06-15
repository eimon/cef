import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Standalone output is enabled for production builds (APP_ENV=production).
  // Dev mode (next dev) ignores this setting entirely.
  output: process.env.APP_ENV === "production" ? "standalone" : undefined,
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "quickchart.io",
        pathname: "/qr**",
      },
    ],
  },
};

export default nextConfig;
