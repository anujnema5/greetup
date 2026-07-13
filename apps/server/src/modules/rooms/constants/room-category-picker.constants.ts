/**
 * System-only room categories — never shown as niches / Start a space options.
 * - `match` — 1:1 matchmaking rooms
 * - `connection` / `connection_call` — private DM calls between connections
 */
export const SYSTEM_ROOM_CATEGORY_SLUGS = [
  "match",
  "connection",
  "connection_call",
] as const;

export const ROOM_CATEGORY_SLUGS_HIDDEN_FROM_PICKER = new Set<string>([
  ...SYSTEM_ROOM_CATEGORY_SLUGS,
  "connection-call",
]);

function normalizeCategorySlug(slug: string): string {
  return slug.trim().toLowerCase().replace(/-/g, "_");
}

export function isRoomCategoryPickable(slug: string): boolean {
  return !ROOM_CATEGORY_SLUGS_HIDDEN_FROM_PICKER.has(normalizeCategorySlug(slug));
}

export function isSystemRoomCategorySlug(slug: string): boolean {
  return !isRoomCategoryPickable(slug);
}
