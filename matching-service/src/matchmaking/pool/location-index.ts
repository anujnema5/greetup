import type { SnapshotUserProfile } from "@/matchmaking/types";
import { normalizeCountryCode, slugLocationPart } from "@/matchmaking/scoring/location";

export type LocationPoolIndexMeta = {
  countryCode?: string;
  citySlug?: string;
  regionSlug?: string;
};

function toStr(v: unknown): string | null {
  return typeof v === "string" && v.trim().length > 0 ? v.trim() : null;
}

/** Derives Redis bucket fields from the hydrated profile snapshot. */
export function buildLocationPoolIndexMeta(snap: SnapshotUserProfile | null): LocationPoolIndexMeta {
  if (!snap) return {};
  const cc =
    normalizeCountryCode(toStr(snap.filters.countryCode)) ??
    normalizeCountryCode(toStr(snap.attributes.countryCode));
  const cityRaw = toStr(snap.filters.city) ?? toStr(snap.attributes.city);
  const regionRaw = toStr(snap.filters.region) ?? toStr(snap.attributes.region);
  const citySlug = slugLocationPart(cityRaw);
  const regionSlug = slugLocationPart(regionRaw);
  const out: LocationPoolIndexMeta = {};
  if (cc) out.countryCode = cc;
  if (cc && citySlug) out.citySlug = citySlug;
  if (cc && regionSlug) out.regionSlug = regionSlug;
  return out;
}
