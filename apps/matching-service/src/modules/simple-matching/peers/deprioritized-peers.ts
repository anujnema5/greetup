import { MATCH_CONFIG } from "@/shared/config/constants";
import { getRedis } from "@/core/redis/client";
import { redisKeys } from "@/core/redis/keys";
import { MatchSkipPeersService } from "@/modules/simple-matching/proposal/skip-peers";

export type DeprioritizedPeerSets = {
  /** Accepted connections + users from past match rooms — ranked after fresh candidates. */
  known: Set<string>;
  /** Explicit proposal skips — ranked last. */
  skipped: Set<string>;
};

/** Reads Redis sets that lower candidate priority during pool ranking (pairing order only — not matchScore). */
export class MatchDeprioritizedPeersService {
  constructor(private readonly skipPeers = new MatchSkipPeersService()) {}

  async getPeerSetsForRanking(userId: string): Promise<DeprioritizedPeerSets> {
    const redis = getRedis();
    const [skipped, matchedMembers, connectionMembers] = await Promise.all([
      this.skipPeers.getSkippedPeerSet(userId),
      redis.smembers(redisKeys.userMatchedPeers(userId)),
      redis.smembers(redisKeys.userConnectionPeers(userId)),
    ]);

    const known = new Set<string>([...matchedMembers, ...connectionMembers]);
    for (const peerId of skipped) {
      known.delete(peerId);
    }

    return { known, skipped };
  }

  /** Remember a completed match so the pair sorts lower on future searches. */
  async recordMatchedPair(userA: string, userB: string): Promise<void> {
    if (userA === userB) return;

    const redis = getRedis();
    const ttl = MATCH_CONFIG.matchedPeerListTtlSeconds;
    await Promise.all([
      redis.sadd(redisKeys.userMatchedPeers(userA), userB).then(() =>
        redis.expire(redisKeys.userMatchedPeers(userA), ttl),
      ),
      redis.sadd(redisKeys.userMatchedPeers(userB), userA).then(() =>
        redis.expire(redisKeys.userMatchedPeers(userB), ttl),
      ),
    ]);
  }
}
