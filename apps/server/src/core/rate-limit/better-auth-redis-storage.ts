import { getRedis } from "@/core/redis";
import logger from "@/core/logging";

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
 *
 * Fail-open: rate limiting is best-effort, so a slow/unreachable Redis must never
 * break authentication. If a command times out (ioredis `commandTimeout`) or errors,
 * we log and degrade gracefully instead of throwing out of the auth request — otherwise
 * `/sign-in/social` never returns the OAuth redirect URL and the client hangs on loading.
 */
export const betterAuthRedisRateLimitStorage = {
  async get(key: string): Promise<BetterAuthRateLimitRecord | undefined> {
    try {
      const raw = await getRedis().get(`${REDIS_KEY_PREFIX}${key}`);
      if (!raw) return undefined;
      return JSON.parse(raw) as BetterAuthRateLimitRecord;
    } catch (err) {
      logger.warn("[rate-limit] Redis get failed; allowing request (fail-open)", {
        err,
      });
      return undefined;
    }
  },

  async set(key: string, value: BetterAuthRateLimitRecord): Promise<void> {
    try {
      await getRedis().set(
        `${REDIS_KEY_PREFIX}${key}`,
        JSON.stringify(value),
        "EX",
        REDIS_TTL_SEC,
      );
    } catch (err) {
      logger.warn("[rate-limit] Redis set failed; skipping persist (fail-open)", {
        err,
      });
    }
  },
};
