export const redisKeys = {
  snapshot: (userId: string) => `user:profile:snapshot:${userId}`,
  poolGlobal: () => "mm:pool:global",
  userState: (userId: string) => `mm:state:${userId}`,
  userLock: (userId: string) => `mm:lock:user:${userId}`,
  pairLock: (userA: string, userB: string) => {
    const [low, high] = [userA, userB].sort();
    return `mm:pair:lock:${low}:${high}`;
  },
  matchJobQueue: () => "mm:jobs:find",
  attempt: (attemptId: string) => `mm:attempt:${attemptId}`,
  userLastAttempt: (userId: string) => `mm:user:last-attempt:${userId}`,
};
