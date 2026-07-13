import type { MiddlewareHandler } from "hono";

import { RATE_LIMIT_KEYS } from "@/core/redis/keys";
import { RateLimitExceededError, UnauthorizedError } from "@/shared/errors";

import { consumeRateLimit } from "./consume-rate-limit";
import { HTTP_RATE_LIMITS, type HttpRateLimitBucket } from "./limits";

/**
 * Per-authenticated-user Redis rate limit. Requires `authMiddleware` (sets `userId`).
 */
export function rateLimitUser(bucket: HttpRateLimitBucket): MiddlewareHandler {
  const policy = HTTP_RATE_LIMITS[bucket];

  return async (c, next) => {
    const userId = c.get("userId") as string | undefined;
    if (!userId) {
      throw new UnauthorizedError();
    }

    const result = await consumeRateLimit({
      key: RATE_LIMIT_KEYS.user(bucket, userId),
      limit: policy.limit,
      windowSec: policy.windowSec,
    });

    if (!result.allowed) {
      c.header("Retry-After", String(result.retryAfterSec));
      throw new RateLimitExceededError();
    }

    await next();
  };
}
