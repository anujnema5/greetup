import type { Metadata } from "next";
import { MarketingPageShell, MarketingSections } from "@/features/marketing";
import { ABOUT_CONTENT } from "@/lib/copy/marketing-pages";
import { buildPageMetadata } from "@/lib/site";

export const metadata: Metadata = buildPageMetadata({
  title: "About",
  description:
    "Learn why Greetup exists, what you can do in early beta, and how we're building real connection around shared interests.",
  path: "/about",
});

export default function AboutPage() {
  return (
    <MarketingPageShell
      eyebrow={ABOUT_CONTENT.eyebrow}
      title={ABOUT_CONTENT.title}
      description={ABOUT_CONTENT.description}
    >
      <MarketingSections sections={ABOUT_CONTENT.sections} />
    </MarketingPageShell>
  );
}
