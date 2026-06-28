/**
 * System-only room categories — not shown in Start a space (or other user pickers).
 * `match` backs matching + DM connection calls; must stay in DB for those flows.
 */
export const ROOM_CATEGORY_SLUGS_HIDDEN_FROM_PICKER = new Set([
  "match",
  "connection_call",
  "connection-call",
]);

function normalizeCategorySlug(slug: string): string {
  return slug.trim().toLowerCase().replace(/-/g, "_");
}

export function isRoomCategoryPickable(slug: string): boolean {
  return !ROOM_CATEGORY_SLUGS_HIDDEN_FROM_PICKER.has(normalizeCategorySlug(slug));
}
