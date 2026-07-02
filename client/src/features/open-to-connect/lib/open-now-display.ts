import type { OpenNowFeedItem } from "../types/open-to-connect.types";

export function openNowPersonLabel(person: OpenNowFeedItem): string {
  const display = person.displayName?.trim();
  if (display) return display;
  const name = person.name?.trim();
  if (name) return name;
  return person.username;
}

export function openNowPersonProfileHref(username: string): string {
  return `/u/${encodeURIComponent(username)}`;
}

export function openNowSharedInterestsText(person: OpenNowFeedItem): string | null {
  const labels = person.sharedInterests?.filter(Boolean) ?? [];
  if (labels.length > 0) return labels.join(" · ");
  return null;
}

export function openNowPrimaryActivityLabel(person: OpenNowFeedItem): string | null {
  const first = person.activities[0];
  if (!first) return person.headline;
  const detail = first.detail?.trim();
  if (detail) return `${first.displayName} · ${detail}`;
  return first.displayName;
}
