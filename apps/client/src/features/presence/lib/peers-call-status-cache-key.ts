/** Stable query key for batch `peersCallStatus` queries. */
export function peersCallStatusCacheKey(userIds: readonly string[]): string {
  return [...new Set(userIds.filter((id) => typeof id === 'string' && id.length > 0))].sort().join('|');
}
