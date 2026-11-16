import type { NextConfig } from "next";

const nextConfig: NextConfig = {\n  async rewrites() {\n    return { afterFiles: [{ source: "/:path*", destination: "/learning/index.html" }] };\n  },
  poweredByHeader: false,
  experimental: {
    serverActions: { bodySizeLimit: "1mb" }
  }
};

export default nextConfig;