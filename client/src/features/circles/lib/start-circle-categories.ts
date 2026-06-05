import type { RoomCategoryDto } from "../types/circles-api.types";

/** Keep in sync with server `ROOM_CATEGORY_SLUGS_HIDDEN_FROM_PICKER`. */
const HIDDEN_CATEGORY_SLUGS = new Set(["match", "connection_call", "connection-call"]);

function normalizeCategorySlug(slug: string): string {
  return slug.trim().toLowerCase().replace(/-/g, "_");
}

export function filterStartCircleCategories(
  categories: readonly RoomCategoryDto[],
): RoomCategoryDto[] {
  return categories.filter((c) => !HIDDEN_CATEGORY_SLUGS.has(normalizeCategorySlug(c.slug)));
}
