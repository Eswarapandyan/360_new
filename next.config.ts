import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Local Supabase's auth email links point at 127.0.0.1:3000 (must match
  // supabase/config.toml's auth.site_url so auth cookies aren't split
  // across two hostnames) -- allow that origin for dev-server HMR/assets.
  allowedDevOrigins: ["127.0.0.1"],
};

export default nextConfig;
