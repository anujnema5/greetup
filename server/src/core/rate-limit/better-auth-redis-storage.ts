import { getRedis } from "@/core/redis";

type BetterAuthRateLimitRecord = {
  key: string;
  count: number;
  lastRequest: number;
};

const REDIS_KEY_PREFIX = "ba:rl:";
/** Cleanup TTL — Better Auth enforces the real window in memory of lastRequest. */
const REDIS_TTL_SEC = 3600;

/**
 * Redis-backed storage for Better Auth's built-in rate limiter (multi-instance safe).
 */
export const betterAuthRedisRateLimitStorage = {
  async get(key: string): Promise<BetterAuthRateLimitRecord | undefined> {
    const raw = await getRedis().get(`${REDIS_KEY_PREFIX}${key}`);
    if (!raw) return undefined;
    try {
      return JSON.parse(raw) as BetterAuthRateLimitRecord;
    } catch {
      return undefined;
    }
  },

  async set(key: string, value: BetterAuthRateLimitRecord): Promise<void> {
    await getRedis().set(
      `${REDIS_KEY_PREFIX}${key}`,
      JSON.stringify(value),
      "EX",
      REDIS_TTL_SEC,
    );
  },
};
