export type ExploreFilter = "for-you" | "live-now" | { type: "niche"; nicheId: string };

export function exploreFilterKey(filter: ExploreFilter): string {
  if (filter === "for-you") return "for-you";
  if (filter === "live-now") return "live-now";
  return `niche:${filter.nicheId}`;
}

export function isSameExploreFilter(a: ExploreFilter, b: ExploreFilter): boolean {
  return exploreFilterKey(a) === exploreFilterKey(b);
}
