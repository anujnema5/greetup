import type { PublicProfileLocation } from "../types/public-profile.types";

function formatDelimitedWords(raw: string): string {
  return raw
    .split(/[_\s]+/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ");
}

export function formatGenderLabel(raw: string): string {
  return formatDelimitedWords(raw);
}

export function formatLocationLine(loc: PublicProfileLocation): string {
  const parts = [loc.city, loc.region, loc.country].filter(
    (p): p is string => Boolean(p && String(p).trim()),
  );
  return parts.join(", ");
}

export function formatEducationLabel(raw: string): string {
  const t = raw.trim();
  if (!t) return "";
  return formatDelimitedWords(t);
}
