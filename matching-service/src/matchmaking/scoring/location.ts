const normalize = (value: string): string => value.trim().toLowerCase();

export type CanonicalDistancePreference =
  | "random"
  | "same_city"
  | "same_region"
  | "same_country"
  | "global";

export function canonicalDistancePreference(
  value: string | null,
): CanonicalDistancePreference | null {
  if (!value) return null;
  const n = normalize(value);
  if (n === "same city" || n === "same_city" || n === "nearby") return "same_city";
  if (n === "same region" || n === "same_region") return "same_region";
  if (n === "same country" || n === "same_country") return "same_country";
  if (n === "global") return "global";
  return "random";
}

/** Normalize ISO country code for Redis bucket keys. */
export function normalizeCountryCode(value: string | null | undefined): string | null {
  if (typeof value !== "string") return null;
  const t = value.trim().toLowerCase();
  return t.length > 0 ? t : null;
}

/** Stable slug for city/region bucket keys (a-z0-9 + underscores). */
export function slugLocationPart(value: string | null | undefined): string | null {
  const t = value?.trim().toLowerCase();
  if (!t) return null;
  const slug = t.replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
  return slug.length > 0 ? slug : null;
}
