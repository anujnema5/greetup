import { MATCH_CONFIG } from "@/shared/config/constants";
import { getRedis } from "@/core/redis/client";
import { redisKeys } from "@/core/redis/keys";

/** Remembers peers a user skipped so they sort last in the next search. */
export class MatchSkipPeersService {
  async recordSkip(skippedByUserId: string, skippedPeerId: string): Promise<void> {
    const redis = getRedis();
    const key = redisKeys.userSkipPeers(skippedByUserId);
    await redis.sadd(key, skippedPeerId);
    await redis.expire(key, MATCH_CONFIG.skipPeerListTtlSeconds);
  }

  async getSkippedPeerSet(skippedByUserId: string): Promise<Set<string>> {
    const redis = getRedis();
    const members = await redis.smembers(redisKeys.userSkipPeers(skippedByUserId));
    return new Set(members);
  }
}
