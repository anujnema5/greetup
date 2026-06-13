import type { Metadata } from "next";
import { CURRENT_HOST } from "@/shared/constants/environments";

export const siteConfig = {
  name: "Greetup",
  domain: "greetup.co",
  url: "https://greetup.co",
  tagline: "Find people by job, city, or what you're into then start talking.",
  description:
    "Meet people one-on-one in real time — matched by job, city, mood, or interests. Chat, voice call, or video. Join group circles around shared topics.",
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

  const ogImage = {
    url: "/opengraph-image",
    width: 1200,
    height: 630,
    alt: `${siteConfig.name} — ${siteConfig.tagline}`,
  };

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
      images: [ogImage],
    },
    twitter: {
      card: "summary_large_image",
      site: siteConfig.twitterHandle,
      title: fullTitle,
      description,
      images: [ogImage],
    },
    robots: noIndex
      ? { index: false, follow: false }
      : {
          index: true,
          follow: true,
          googleBot: { index: true, follow: true, "max-image-preview": "large" },
        },
    keywords: [
      "Greetup",
      "meet people online",
      "make friends online",
      "interest matching",
      "video chat",
      "live circles",
      "networking by profession",
      "1:1 matching",
      "group video chat",
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
  category: "social",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  icons: {
    icon: [{ url: "/icon", type: "image/png", sizes: "32x32" }],
    apple: [{ url: "/apple-icon", type: "image/png", sizes: "180x180" }],
  },
  manifest: "/manifest.webmanifest",
};
