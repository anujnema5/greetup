import type { Metadata } from "next";
import { LandingPageView } from "./landing/page";
import { buildPageMetadata } from "@/lib/site";

export const metadata: Metadata = buildPageMetadata({
  title: "Meet People by Job, Interests & Location",
  description:
    "Match 1:1 in real time by profession, city, or what you're into — then chat, voice, or video. Join live circles around shared topics. Free beta.",
  path: "/",
});

export default function HomePage() {
  return <LandingPageView />;
}
