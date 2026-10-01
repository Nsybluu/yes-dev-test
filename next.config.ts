import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // Excel uploads go through a Server Action; the default cap is 1MB
    serverActions: { bodySizeLimit: "3mb" },
  },
};

export default nextConfig;
