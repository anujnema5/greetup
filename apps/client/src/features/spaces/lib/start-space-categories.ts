import type { RoomCategoryDto } from "../types/spaces-api.types";

/** Keep in sync with server `SYSTEM_ROOM_CATEGORY_SLUGS`. */
const HIDDEN_CATEGORY_SLUGS = new Set([
  "match",
  "connection",
  "connection_call",
  "connection-call",
]);

const HIDDEN_CATEGORY_LABELS = new Set(["match", "connection call"]);

function normalizeCategorySlug(slug: string): string {
  return slug.trim().toLowerCase().replace(/-/g, "_");
}

function isHiddenCategory(category: Pick<RoomCategoryDto, "slug" | "displayName">): boolean {
  if (HIDDEN_CATEGORY_SLUGS.has(normalizeCategorySlug(category.slug))) return true;
  return HIDDEN_CATEGORY_LABELS.has(category.displayName.trim().toLowerCase());
}

export function filterStartSpaceCategories(
  categories: readonly RoomCategoryDto[],
): RoomCategoryDto[] {
  return categories.filter((c) => !isHiddenCategory(c));
}
