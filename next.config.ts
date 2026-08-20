import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["192.168.1.65"],
  serverExternalPackages: ["mongoose"],
  experimental: {
    serverActions: {
      bodySizeLimit: "5mb",
    },
    proxyClientMaxBodySize: "5mb",
  },
  headers: async () => [
    {
      source: "/sw.js",
      headers: [
        {
          key: "Cache-Control",
          value: "public, max-age=0, must-revalidate",
        },
        {
          key: "Service-Worker-Allowed",
          value: "/",
        },
      ],
    },
  ],
};

export default nextConfig;
