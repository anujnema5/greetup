import type { NextConfig } from "next";

import { PRODUCTION_ORIGIN, SITE_DOMAIN } from "./site-domain";

/** Hono + Better Auth. Browser calls `http://localhost:3000/api/...` so Set-Cookie is first-party (port 3000 → 5300 XHR drops cookies otherwise). */
const API_BACKEND_ORIGIN =
  process.env.API_BACKEND_ORIGIN?.replace(/\/+$/, "") || "http://localhost:5300";

const nextConfig: NextConfig = {
  transpilePackages: ["@greetup/shared"],
  async redirects() {
    return [
      {
        source: "/:path*",
        has: [{ type: "host", value: `www.${SITE_DOMAIN}` }],
        destination: `${PRODUCTION_ORIGIN}/:path*`,
        permanent: true,
      },
    ];
  },
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${API_BACKEND_ORIGIN}/api/:path*`,
      },
    ];
  },
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
