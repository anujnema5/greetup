import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Keep policy minimal and allow same-origin geolocation for match-prep location capture.
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          {
            key: "Permissions-Policy",
            value: "geolocation=(self), interest-cohort=()",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
