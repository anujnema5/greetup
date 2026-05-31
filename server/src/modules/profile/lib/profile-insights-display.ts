export function initialsFromDisplayName(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return (parts[0]![0]! + parts[1]![0]!).toUpperCase();
  }
  if (parts.length === 1 && parts[0]!.length >= 2) {
    return parts[0]!.slice(0, 2).toUpperCase();
  }
  return parts[0]?.[0]?.toUpperCase() ?? "?";
}

export function buildPeerTagline(input: {
  professionLabel: string | null;
  bio: string | null;
}): string | null {
  const profession = input.professionLabel?.trim();
  if (profession) return profession;

  const bio = input.bio?.trim();
  if (!bio) return null;
  return bio.length > 72 ? `${bio.slice(0, 72)}…` : bio;
}

/** Raw SQL / driver may return `Date` or ISO string — normalize for API responses. */
export function toIsoTimestamp(value: unknown): string {
  if (value instanceof Date) return value.toISOString();
  if (value == null) return new Date(0).toISOString();
  const parsed = new Date(value as string | number);
  return Number.isNaN(parsed.getTime()) ? new Date(0).toISOString() : parsed.toISOString();
}
