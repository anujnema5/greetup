import type { FindMatchResult } from "@/contracts/matchmaking.contracts";
import { logger } from "@/core/logger";
import type { MatchAttemptRepository } from "@/matchmaking/infrastructure/repositories/match-attempt.repository";
import { getRedis } from "@/redis/client";
import { redisKeys } from "@/redis/keys";

/** Redis TTL for `userStartSearchLock` — must cover setSearching + pool + job enqueue. */
export const START_SEARCH_LOCK_TTL_SEC = 10;
/** Max time to wait for the lock while another tab finishes starting search. */
export const START_SEARCH_LOCK_WAIT_MS = 3_000;
export const START_SEARCH_LOCK_POLL_MS = 25;

export function searchingWithRequestId(requestId: string): FindMatchResult {
  return { status: "searching", retryAfterMs: 1_000, requestId };
}

/**
 * Reuse an in-flight search or open proposal so concurrent `startFindMatch` calls
 * do not create duplicate attempts or pool jobs.
 */
export async function coalesceActiveSearchOrProposal(
  attempts: MatchAttemptRepository,
  userId: string,
): Promise<FindMatchResult | null> {
  const lastId = await getRedis().get(redisKeys.userLastAttempt(userId));
  if (!lastId) return null;
  const last = await attempts.getAttempt(lastId);
  if (!last) return null;
  if (last.status === "searching") {
    logger.info("[startFindMatch] coalesce — already searching", { userId, requestId: lastId });
    return searchingWithRequestId(lastId);
  }
  if (last.status === "proposed" && last.peerUserId) {
    logger.info("[startFindMatch] coalesce — already proposed", { userId, requestId: lastId });
    return attempts.toResult(last);
  }
  return null;
}

export async function tryAcquireStartSearchLock(userId: string, requestId: string): Promise<boolean> {
  const ok = await getRedis().set(
    redisKeys.userStartSearchLock(userId),
    requestId,
    "EX",
    START_SEARCH_LOCK_TTL_SEC,
    "NX",
  );
  return Boolean(ok);
}

export async function releaseStartSearchLockIfHolder(userId: string, requestId: string): Promise<void> {
  const redis = getRedis();
  const lockKey = redisKeys.userStartSearchLock(userId);
  const holder = await redis.get(lockKey);
  if (holder === requestId) await redis.del(lockKey);
}
