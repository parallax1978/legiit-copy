import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The web app imports the engine's plain TypeScript (schemas, format specs, pipeline graph, renderer)
  // from supabase/functions/_shared/engine via the @engine/* alias; these files live outside apps/web.
  experimental: { externalDir: true },
  // Deno-only modules must never reach the browser bundle. The alias points at plain files only.
  serverExternalPackages: ["@anthropic-ai/sdk"],
  typescript: { ignoreBuildErrors: false },
  images: { remotePatterns: [] },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
          { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
        ],
      },
    ];
  },
};

export default nextConfig;
