import { getRedis } from "@/core/redis";
import { OPEN_TO_CONNECT_KEYS } from "@/core/redis/keys";

import { RECENT_NO_MATCH_SUGGESTIONS_TTL_SEC } from "../constants";

export async function markRecentNoMatchForSuggestions(
  userId: string,
  reason: string,
): Promise<void> {
  const redis = getRedis();
  await redis.setex(
    OPEN_TO_CONNECT_KEYS.recentNoMatch(userId),
    RECENT_NO_MATCH_SUGGESTIONS_TTL_SEC,
    reason,
  );
}

export async function getRecentNoMatchReasonForSuggestions(
  userId: string,
): Promise<string | null> {
  const redis = getRedis();
  return redis.get(OPEN_TO_CONNECT_KEYS.recentNoMatch(userId));
}
