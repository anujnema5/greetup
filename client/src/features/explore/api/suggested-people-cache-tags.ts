/** RTK cache tag for `GET /search/suggested-people` — invalidate after blocks / connections. */
export const CACHE_EXPLORE_SUGGESTED_PEOPLE = {
  type: "ExploreSuggestedPeople" as const,
  id: "LIST" as const,
};
