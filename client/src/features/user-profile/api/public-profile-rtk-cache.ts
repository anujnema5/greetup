/**
 * Canonical RTK Query tag id for `GET /profile/public/:username`.
 * Use everywhere we `providesTags` or `invalidatesTags` for `PublicProfile`, so
 * cache invalidation still matches when the URL username differs only by case.
 */
export function publicProfileRtkCacheId(username: string): string {
  return username.trim().toLowerCase();
}
