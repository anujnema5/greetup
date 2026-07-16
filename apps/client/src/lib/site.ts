import type { Metadata } from "next";
import { CURRENT_HOST, PRODUCTION_ORIGIN, SITE_DOMAIN } from "@/shared/constants/environments";

export const siteConfig = {
  name: "Greetup",
  domain: SITE_DOMAIN,
  url: PRODUCTION_ORIGIN,
  tagline: "Meet people, not profiles",
  description:
    "Meet like-minded people online — matched by interests, job, or mood. Talk your way with chat, voice, or video. Join live spaces around what you care about.",
  contactEmail: "hello@greetup.club",
  supportEmail: "support@greetup.club",
  locale: "en_US",
  twitterHandle: "@greetup",
} as const;

export function absoluteUrl(path = "/"): string {
  const base =
    process.env.NODE_ENV === "production"
      ? siteConfig.url.replace(/\/+$/, "")
      : (CURRENT_HOST || siteConfig.url).replace(/\/+$/, "");
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
  const fullTitle =
    path === "/"
      ? title.trim()
        ? `${siteConfig.name} | ${title}`
        : `${siteConfig.name} — ${siteConfig.tagline}`
      : `${title} • ${siteConfig.name}`;

  const ogImage = {
    url: "/opengraph-image",
    width: 1200,
    height: 630,
    alt: `${siteConfig.name} — ${siteConfig.tagline}`,
  };

  return {
    title: fullTitle,
    description,
    metadataBase: new URL(
      process.env.NODE_ENV === "production" ? siteConfig.url : CURRENT_HOST || siteConfig.url,
    ),
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
      "find people to talk to",
      "meet like-minded people",
      "interest based matching",
      "real-time chat",
      "voice chat online",
      "video chat",
      "connect with new people",
      "live spaces",
    ],
  };
}

export const rootMetadata: Metadata = {
  ...buildPageMetadata({
    title: "",
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
