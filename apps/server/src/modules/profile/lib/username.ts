const USERNAME_REGEX = /^[a-z0-9_]+$/;
const GUEST_PLACEHOLDER_PREFIX = "guest_";

export type UsernameVibe = "cozy" | "playful" | "mysterious" | "creative" | "classic" | "random";

export function normalizeUsername(value: string): string {
  return value.trim().toLowerCase();
}

export function isValidUsernameFormat(username: string): boolean {
  const value = normalizeUsername(username);
  return value.length >= 3 && value.length <= 30 && USERNAME_REGEX.test(value);
}

/** True for auto-generated handles that should not count as a chosen username. */
export function isPlaceholderUsername(username: string | null | undefined): boolean {
  const value = normalizeUsername(username ?? "");
  if (!value) return true;
  if (value.startsWith(GUEST_PLACEHOLDER_PREFIX)) return true;
  if (value.length >= 20 && /^g[a-f0-9]+$/.test(value)) return true;
  if (value.length >= 20 && /^[a-f0-9]+$/.test(value)) return true;
  return false;
}

export function slugifyUsernameToken(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .replace(/_+/g, "_")
    .slice(0, 14);
}

export function trimUsernameToMax(base: string, suffix: string, max = 30): string {
  const room = max - suffix.length;
  if (room < 3) return base.slice(0, max);
  return `${base.slice(0, room)}${suffix}`;
}
