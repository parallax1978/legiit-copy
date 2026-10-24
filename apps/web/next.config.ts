import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The web app imports the engine's plain TypeScript (schemas, format specs, pipeline graph, renderer)
  // from supabase/functions/_shared/engine via the @engine/* alias; these files live outside apps/web.
  experimental: { externalDir: true },
  // Deno-only modules must never reach the browser bundle. The alias points at plain files only.
  serverExternalPackages: ["@anthropic-ai/sdk"],
  typescript: { ignoreBuildErrors: false },
  images: { remotePatterns: [] },
};

export default nextConfig;
