import type { Metadata } from "next";
import { MarketingPageShell } from "@/components/marketing/marketing-page-shell";
import { MarketingSections } from "@/components/marketing/marketing-sections";
import { PRIVACY_CONTENT } from "@/lib/copy/marketing-pages";
import { buildPageMetadata } from "@/lib/site";

export const metadata: Metadata = buildPageMetadata({
  title: "Privacy Policy",
  description: "Learn how Greetup collects, uses, and protects your information.",
  path: "/privacy",
});

export default function PrivacyPage() {
  return (
    <MarketingPageShell
      eyebrow={PRIVACY_CONTENT.eyebrow}
      title={PRIVACY_CONTENT.title}
      description={PRIVACY_CONTENT.description}
    >
      <MarketingSections sections={PRIVACY_CONTENT.sections} />
    </MarketingPageShell>
  );
}
