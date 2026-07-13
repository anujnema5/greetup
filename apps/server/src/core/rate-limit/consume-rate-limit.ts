import { getRedis } from "@/core/redis";

export type ConsumeRateLimitParams = {
  key: string;
  limit: number;
  windowSec: number;
};

export type ConsumeRateLimitResult = {
  allowed: boolean;
  count: number;
  retryAfterSec: number;
};

/**
 * Fixed-window counter via Redis INCR + EXPIRE (same pattern as chat / OTC / guest).
 * Increments even when over limit so the window stays consistent.
 */
export async function consumeRateLimit(
  params: ConsumeRateLimitParams,
): Promise<ConsumeRateLimitResult> {
  const redis = getRedis();
  const count = await redis.incr(params.key);
  if (count === 1) {
    await redis.expire(params.key, params.windowSec);
  }

  const ttl = await redis.ttl(params.key);
  const retryAfterSec = ttl > 0 ? ttl : params.windowSec;

  return {
    allowed: count <= params.limit,
    count,
    retryAfterSec,
  };
}
