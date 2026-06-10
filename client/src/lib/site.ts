import type { Metadata } from "next";
import { CURRENT_HOST } from "@/shared/constants/environments";

export const siteConfig = {
  name: "Greetup",
  domain: "greetup.co",
  url: "https://greetup.co",
  tagline: "Directly connect with the people you want.",
  description:
    "Connect directly with the people you want. Match by job, location, or what you're looking for. Chat, voice, or video. It's up to you.",
  contactEmail: "hello@greetup.co",
  supportEmail: "support@greetup.co",
  locale: "en_US",
  twitterHandle: "@greetup",
} as const;

export function absoluteUrl(path = "/"): string {
  const base = (CURRENT_HOST || siteConfig.url).replace(/\/+$/, "");
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return `${base}${normalized}`;
}

type PageMetadataInput = {
  title: string;
  description?: string;
  path?: string;
  noIndex?: boolean;
};

export function buildPageMetadata({
  title,
  description = siteConfig.description,
  path = "/",
  noIndex = false,
}: PageMetadataInput): Metadata {
  const url = absoluteUrl(path);
  const fullTitle = path === "/" ? `${siteConfig.name} | ${title}` : `${title} · ${siteConfig.name}`;

  return {
    title: fullTitle,
    description,
    metadataBase: new URL(CURRENT_HOST || siteConfig.url),
    alternates: { canonical: url },
    openGraph: {
      type: "website",
      locale: siteConfig.locale,
      url,
      siteName: siteConfig.name,
      title: fullTitle,
      description,
    },
    twitter: {
      card: "summary_large_image",
      title: fullTitle,
      description,
    },
    robots: noIndex ? { index: false, follow: false } : { index: true, follow: true },
    keywords: [
      "Greetup",
      "social matching",
      "interest matching",
      "live circles",
      "video chat",
      "networking",
      "community",
      "1:1 matching",
    ],
  };
}

export const rootMetadata: Metadata = {
  ...buildPageMetadata({
    title: siteConfig.tagline,
    description: siteConfig.description,
    path: "/",
  }),
  applicationName: siteConfig.name,
  authors: [{ name: siteConfig.name, url: absoluteUrl("/") }],
  creator: siteConfig.name,
  publisher: siteConfig.name,
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
};
