import type { ActiveSpaceItem } from "@/features/spaces/types/spaces-api.types";

import type { BrowseNicheItem } from "../types/browse-niches.types";

/** Minimum characters before search runs. */
export const APP_SEARCH_MIN_LENGTH = 2;

/** Max results per category in the dropdown and full search. */
export const APP_SEARCH_RESULT_LIMIT = 15;

/** Max rows shown per section in the compact dropdown. */
export const APP_SEARCH_DROPDOWN_SECTION_LIMIT = 4;

function normalizeQuery(query: string): string {
  return query.trim().toLowerCase();
}

function matchesSpace(space: ActiveSpaceItem, normalizedQuery: string): boolean {
  const haystack = [
    space.title,
    space.description,
    space.category.displayName,
    space.category.slug,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  return haystack.includes(normalizedQuery);
}

function matchesTopic(topic: BrowseNicheItem, normalizedQuery: string): boolean {
  const haystack = [topic.displayName, topic.slug, topic.description]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  return haystack.includes(normalizedQuery);
}

export function filterSpacesForSearch(
  spaces: readonly ActiveSpaceItem[],
  query: string,
  limit = APP_SEARCH_RESULT_LIMIT,
): ActiveSpaceItem[] {
  const normalized = normalizeQuery(query);
  if (!normalized) return [];

  return spaces.filter((space) => matchesSpace(space, normalized)).slice(0, limit);
}

export function filterTopicsForSearch(
  topics: readonly BrowseNicheItem[],
  query: string,
  limit = APP_SEARCH_RESULT_LIMIT,
): BrowseNicheItem[] {
  const normalized = normalizeQuery(query);
  if (!normalized) return [];

  return topics.filter((topic) => matchesTopic(topic, normalized)).slice(0, limit);
}
