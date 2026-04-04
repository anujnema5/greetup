import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Ensures HTML responses allow getUserMedia even if `src/proxy.ts` skips a path.
  // Omit camera/microphone — listing them is what triggered Permissions-Policy violations.
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          {
            key: "Permissions-Policy",
            value: "geolocation=(), interest-cohort=()",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
