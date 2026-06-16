import type { Metadata } from "next";

import { LandingPage } from "@/features/landing";
import { buildPageMetadata } from "@/lib/site";

export const metadata: Metadata = buildPageMetadata({
  title: "Meet people online — chat, voice, or video, matched to you",
  description:
    "Meet like-minded people online — matched by interests, job, or mood. Talk your way with chat, voice, or video. Join live circles around what you care about.",
  path: "/",
});

export default function HomePage() {
  return <LandingPage />;
}
