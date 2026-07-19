import type { Metadata } from "next";

import { LandingPage } from "@/features/landing";
import { RootAuthGate } from "@/components/root-auth-gate";
import { buildPageMetadata } from "@/lib/site";

export const metadata: Metadata = buildPageMetadata({
  title: "",
  description:
    "Meet like-minded people online — matched by interests, job, or mood. Talk your way with chat, voice, or video. Join live spaces around what you care about.",
  path: "/",
});

export default function HomePage() {
  return (
    <>
      <LandingPage />
      <RootAuthGate />
    </>
  );
}
