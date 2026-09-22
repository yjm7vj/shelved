import { withSentryConfig } from "@sentry/nextjs";
import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  // Pin the workspace root; stray lockfiles further up the tree confuse Turbopack.
  turbopack: { root: path.resolve(process.cwd()) },
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "media.rawg.io" },
      { protocol: "https", hostname: "cdn.cloudflare.steamstatic.com" },
      { protocol: "https", hostname: "media.steampowered.com" },
      { protocol: "https", hostname: "img.clerk.com" },
    ],
  },
};

// Source map upload only happens when the Sentry org/project are configured,
// so local builds and forks are unaffected.
export default process.env.SENTRY_ORG && process.env.SENTRY_PROJECT
  ? withSentryConfig(nextConfig, {
      org: process.env.SENTRY_ORG,
      project: process.env.SENTRY_PROJECT,
      silent: true,
    })
  : nextConfig;
