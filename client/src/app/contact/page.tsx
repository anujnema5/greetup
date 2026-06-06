import type { Metadata } from "next";
import { ContactForm } from "@/components/marketing/contact-form";
import { MarketingPageShell } from "@/components/marketing/marketing-page-shell";
import { CONTACT_CONTENT } from "@/lib/copy/marketing-pages";
import { buildPageMetadata } from "@/lib/site";

export const metadata: Metadata = buildPageMetadata({
  title: "Contact",
  description: "Get in touch with the Greetup team for support, feedback, or partnerships.",
  path: "/contact",
});

export default function ContactPage() {
  return (
    <MarketingPageShell
      eyebrow={CONTACT_CONTENT.eyebrow}
      title={CONTACT_CONTENT.title}
      description={CONTACT_CONTENT.description}
    >
      <ContactForm />
    </MarketingPageShell>
  );
}
