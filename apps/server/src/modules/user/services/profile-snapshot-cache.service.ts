import logger from "@/core/logging";
import { getRedis } from "@/core/redis";
import { CACHE_TTL, USER_CACHE_KEYS } from "@/core/redis/keys";
import { userProfilesRepository } from "@/modules/profile/repositories/user-profiles.repository";

const PROFILE_CACHE_TTL_SECONDS = CACHE_TTL.MEDIUM;

/**
 * Loads the user profile from Postgres and writes `user:profile:snapshot:{userId}` in Redis
 * if the key is missing (SET NX). Used on socket connect and when the matching engine
 * requests hydration via internal webhook.
 */
export async function ensureProfileSnapshotCached(userId: string): Promise<boolean> {
  const redis = getRedis();
  const cacheKey = `${USER_CACHE_KEYS.PROFILE_SNAPSHOT}${userId}`;

  if (await redis.exists(cacheKey)) {
    return true;
  }

  const profileSnapshot = await userProfilesRepository.findProfileSnapshotForCache(userId);
  if (!profileSnapshot) {
    logger.warn("[ensureProfileSnapshotCached] No profile row for user — cannot cache snapshot", { userId });
    return false;
  }

  const result = await redis.set(
    cacheKey,
    JSON.stringify(profileSnapshot),
    "EX",
    PROFILE_CACHE_TTL_SECONDS,
    "NX",
  );

  if (result === "OK") {
    logger.info("[ensureProfileSnapshotCached] Cached profile snapshot", { userId });
    return true;
  }

  return (await redis.exists(cacheKey)) === 1;
}

/**
 * Rebuilds `user:profile:snapshot:{userId}` from Postgres and overwrites Redis.
 * Call after any profile mutation so matching reads fresh data (NX-only cache would stay stale).
 */
export async function refreshProfileSnapshotFromDatabase(
  userId: string
): Promise<boolean> {
  const redis = getRedis();
  const cacheKey = `${USER_CACHE_KEYS.PROFILE_SNAPSHOT}${userId}`;
  const profileSnapshot = await userProfilesRepository.findProfileSnapshotForCache(userId);

  if (!profileSnapshot) {
    await redis.del(cacheKey);
    logger.warn("[refreshProfileSnapshotFromDatabase] No profile row — removed snapshot key", {
      userId,
    });
    return false;
  }

  await redis.set(
    cacheKey,
    JSON.stringify(profileSnapshot),
    "EX",
    PROFILE_CACHE_TTL_SECONDS
  );
  logger.info("[refreshProfileSnapshotFromDatabase] Refreshed profile snapshot", { userId });
  return true;
}
