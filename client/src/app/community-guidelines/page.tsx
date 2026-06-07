import type { Metadata } from "next";
import { MarketingPageShell } from "@/components/marketing/marketing-page-shell";
import { MarketingSections } from "@/components/marketing/marketing-sections";
import { COMMUNITY_GUIDELINES_CONTENT } from "@/lib/copy/marketing-pages";
import { buildPageMetadata } from "@/lib/site";

export const metadata: Metadata = buildPageMetadata({
  title: "Community Guidelines",
  description: "Greetup community standards for respectful, safe, and genuine connection.",
  path: "/community-guidelines",
});

export default function CommunityGuidelinesPage() {
  return (
    <MarketingPageShell
      eyebrow={COMMUNITY_GUIDELINES_CONTENT.eyebrow}
      title={COMMUNITY_GUIDELINES_CONTENT.title}
      description={COMMUNITY_GUIDELINES_CONTENT.description}
    >
      <MarketingSections sections={COMMUNITY_GUIDELINES_CONTENT.sections} />
    </MarketingPageShell>
  );
}
