import type { Metadata } from "next";

import { LandingPage } from "@/features/landing";
import { buildPageMetadata } from "@/lib/site";

/** Homepage SEO — title/description/keywords come from `siteConfig`. */
export const metadata: Metadata = buildPageMetadata({
  title: "",
  path: "/",
});

export default function HomePage() {
  return <LandingPage />;
}
