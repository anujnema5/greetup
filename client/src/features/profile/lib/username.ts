const USERNAME_REGEX = /^[a-z0-9_]+$/;

export type UsernameVibe = "cozy" | "playful" | "mysterious" | "creative" | "classic" | "random";

export const USERNAME_VIBES: Array<{ id: UsernameVibe; label: string }> = [
  { id: "cozy", label: "Calm" },
  { id: "playful", label: "Gaming" },
  { id: "mysterious", label: "Low-key" },
  { id: "creative", label: "Creative" },
  { id: "classic", label: "Classic" },
  { id: "random", label: "Mixed" },
];

export function normalizeUsername(value: string): string {
  return value.trim().toLowerCase().replace(/\s/g, "");
}

export function isValidUsernameFormat(username: string): boolean {
  const value = normalizeUsername(username);
  return value.length >= 3 && value.length <= 30 && USERNAME_REGEX.test(value);
}

export function formatUsernameForDisplay(username: string): string {
  const value = normalizeUsername(username);
  if (!value) return "";
  return value.replace(/_/g, " ");
}

export function profileLinkPath(username: string): string {
  const value = normalizeUsername(username);
  return value ? `/u/${value}` : "/u/your-link";
}

export function sanitizeUsernameInput(value: string): string {
  return value.replace(/\s/g, "").toLowerCase().replace(/[^a-z0-9_]/g, "");
}

/** Rough handle from display name — for input placeholder only. */
export function usernamePlaceholderFromDisplayName(displayName: string | null | undefined): string {
  const slug = displayName
    ?.trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .replace(/_+/g, "_")
    .slice(0, 30);
  if (slug && slug.length >= 3) return slug;
  return "yourname";
}
