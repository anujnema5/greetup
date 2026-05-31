import type { Metadata } from "next";

const SITE_NAME = "Greetup";

export function createPageMetadata(
  title: string,
  description?: string,
): Metadata {
  const fullTitle = title === SITE_NAME ? SITE_NAME : `${title} · ${SITE_NAME}`;

  return {
    title: fullTitle,
    ...(description ? { description } : {}),
  };
}
