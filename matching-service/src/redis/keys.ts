export const redisKeys = {
  snapshot: (userId: string) => `user:profile:snapshot:${userId}`,
  poolGlobal: () => "mm:pool:global",
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
