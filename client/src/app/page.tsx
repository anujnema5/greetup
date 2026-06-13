import type { Metadata } from "next";
import { LandingPageView } from "./landing/page";
import { buildPageMetadata } from "@/lib/site";

export const metadata: Metadata = buildPageMetadata({
  title: "Find people by job, city, interests, or what you're into then start talking.",
  description: "Meet people one-on-one in real time — matched by job, city, mood, or interests. Chat, voice call, or video. Join group circles around shared topics.",
  path: "/",
});

export default function HomePage() {
  return <LandingPageView />;
}
