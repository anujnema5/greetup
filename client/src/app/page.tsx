import type { Metadata } from "next";
import { LandingPageView } from "./landing/page";
import { buildPageMetadata, siteConfig } from "@/lib/site";

export const metadata: Metadata = buildPageMetadata({
  title: siteConfig.tagline,
  description: siteConfig.description,
  path: "/",
});

export default function HomePage() {
  return <LandingPageView />;
}
