import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Standalone output produces a self-contained .next/standalone dir we copy
  // into our Dockerfile. Lets the production image stay tiny (no node_modules).
  output: "standalone",

  // Allow next/image to optimize the local-FS uploads served from /public/uploads/.
  // Production storage goes to S3-compatible (lib/storage.ts) and those URLs are
  // already absolute; this just covers the dev path.
  images: {
    localPatterns: [{ pathname: "/uploads/**" }, { pathname: "/brand/**" }],
    remotePatterns: [
      // Allow images served from any S3-compatible host configured via env.
      // Stays portable across DO Spaces / R2 / S3.
      { protocol: "https", hostname: "**" },
    ],
  },
};

export default nextConfig;
