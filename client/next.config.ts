import type { NextConfig } from "next";

/** Hono + Better Auth. Browser calls `http://localhost:3000/api/...` so Set-Cookie is first-party (port 3000 → 5300 XHR drops cookies otherwise). */
const API_BACKEND_ORIGIN =
  process.env.API_BACKEND_ORIGIN?.replace(/\/+$/, "") || "http://localhost:5300";

const nextConfig: NextConfig = {
  experimental: {
    optimizePackageImports: [
      "lucide-react",
      "date-fns",
      "react-icons",
      "@radix-ui/react-dialog",
      "@radix-ui/react-dropdown-menu",
      "@radix-ui/react-select",
      "@radix-ui/react-popover",
      "@radix-ui/react-tabs",
      "@radix-ui/react-hover-card",
      "framer-motion",
    ],
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
