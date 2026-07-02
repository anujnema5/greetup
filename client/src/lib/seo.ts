import type { MetadataRoute } from "next";

import { absoluteUrl } from "@/lib/site";

export type SitemapRoute = {
  path: string;
  changeFrequency: MetadataRoute.Sitemap[number]["changeFrequency"];
  priority: number;
};

/** Public marketing and entry pages included in sitemap.xml */
export const PUBLIC_SITEMAP_ROUTES: SitemapRoute[] = [
  { path: "/", changeFrequency: "weekly", priority: 1 },
  { path: "/try", changeFrequency: "weekly", priority: 0.9 },
  { path: "/register", changeFrequency: "monthly", priority: 0.8 },
  { path: "/login", changeFrequency: "monthly", priority: 0.6 },
  { path: "/about", changeFrequency: "monthly", priority: 0.7 },
  { path: "/contact", changeFrequency: "monthly", priority: 0.6 },
  { path: "/community-guidelines", changeFrequency: "monthly", priority: 0.5 },
  { path: "/privacy", changeFrequency: "yearly", priority: 0.4 },
  { path: "/terms", changeFrequency: "yearly", priority: 0.4 },
];

/** App, assets, and user-specific paths blocked in robots.txt */
export const ROBOTS_DISALLOW_PATHS = [
  "/api/",
  "/opengraph-image",
  "/manifest.webmanifest",
  "/icon",
  "/apple-icon",
  "/home",
  "/explore",
  "/spaces",
  "/connections",
  "/messages",
  "/profile",
  "/settings",
  "/profile-setup",
  "/space/",
  "/u/",
  "/try/complete",
  "/forgot-password",
  "/reset-password",
  "/verify-email",
  "/landing",
  "/_next/",
] as const;

export function buildSitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();

  return PUBLIC_SITEMAP_ROUTES.map(({ path, changeFrequency, priority }) => ({
    url: absoluteUrl(path),
    lastModified,
    changeFrequency,
    priority,
  }));
}
