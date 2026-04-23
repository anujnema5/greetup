export const redisKeys = {
  snapshot: (userId: string) => `user:profile:snapshot:${userId}`,
  poolGlobal: () => "mm:pool:global",
  /** Sorted set: users searching in this country (ISO cc lowercased). */
  poolByCountry: (countryCode: string) => `mm:pool:cc:${countryCode}`,
  /** Sorted set: users in this country + city slug. */
  poolByCity: (countryCode: string, citySlug: string) => `mm:pool:city:${countryCode}:${citySlug}`,
  /** Sorted set: users in this country + region slug. */
  poolByRegion: (countryCode: string, regionSlug: string) => `mm:pool:reg:${countryCode}:${regionSlug}`,
  /** JSON meta for removing user from country/city/region zsets. */
  poolUserLocationMeta: (userId: string) => `mm:pool:loc-meta:${userId}`,
  userState: (userId: string) => `mm:state:${userId}`,
  userLock: (userId: string) => `mm:lock:user:${userId}`,
  pairLock: (userA: string, userB: string) => {
    const [low, high] = [userA, userB].sort();
    return `mm:pair:lock:${low}:${high}`;
  },
  /** Sorted user ids — pending mutual "Connect" before room creation */
  pairPending: (userA: string, userB: string) => {
    const [low, high] = [userA, userB].sort();
    return `mm:pair:pending:${low}:${high}`;
  },
  pairConnectFinalize: (userA: string, userB: string) => {
    const [low, high] = [userA, userB].sort();
    return `mm:pair:connect:finalize:${low}:${high}`;
  },
  /** Users this user skipped during match proposal — deprioritized in future candidate ordering */
  userSkipPeers: (userId: string) => `mm:user:skip-peers:${userId}`,
  matchJobQueue: () => "mm:jobs:find",
  attempt: (attemptId: string) => `mm:attempt:${attemptId}`,
  userLastAttempt: (userId: string) => `mm:user:last-attempt:${userId}`,
  /** Serialize concurrent startFindMatch for the same user (multi-tab / double POST). */
  userStartSearchLock: (userId: string) => `mm:user:start-search-lock:${userId}`,
};
