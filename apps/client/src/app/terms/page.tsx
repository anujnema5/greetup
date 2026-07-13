import type { Metadata } from "next";
import { MarketingPageShell, MarketingSections } from "@/features/marketing";
import { TERMS_CONTENT } from "@/lib/copy/marketing-pages";
import { buildPageMetadata } from "@/lib/site";

export const metadata: Metadata = buildPageMetadata({
  title: "Terms & Conditions",
  description: "Read the terms and conditions for using Greetup.",
  path: "/terms",
});

export default function TermsPage() {
  return (
    <MarketingPageShell
      eyebrow={TERMS_CONTENT.eyebrow}
      title={TERMS_CONTENT.title}
      description={TERMS_CONTENT.description}
    >
      <MarketingSections sections={TERMS_CONTENT.sections} />
    </MarketingPageShell>
  );
}
