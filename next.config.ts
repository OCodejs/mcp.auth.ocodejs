import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    return { afterFiles: [{ source: "/:path*", destination: "/learning/index.html" }] };
  },
  poweredByHeader: false,
  experimental: {
    serverActions: { bodySizeLimit: "1mb" }
  }
};

export default nextConfig;