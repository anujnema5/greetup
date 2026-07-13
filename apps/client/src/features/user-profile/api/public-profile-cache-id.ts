/**
 * Canonical cache id for `GET /profile/public/:username`.
 * Lowercase so invalidation matches when the URL username differs only by case.
 */
export function publicProfileCacheId(username: string): string {
  return username.trim().toLowerCase();
}
