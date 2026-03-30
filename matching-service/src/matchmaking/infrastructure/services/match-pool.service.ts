import type { MatchCandidate } from "@/matchmaking/domain/matching.types";
import { getRedis } from "@/redis/client";
import { redisKeys } from "@/redis/keys";

const CANDIDATE_SCAN_LIMIT = 100;
const MAX_CANDIDATES = 25;

export class MatchPoolService {
  async enqueue(userId: string): Promise<void> {
    const redis = getRedis();
    const now = Date.now();

    const pipeline = redis.pipeline();
    pipeline.zadd(redisKeys.poolGlobal(), now, userId);
    pipeline.set(redisKeys.userState(userId), "searching");
    await pipeline.exec();
  }

  /** Drops the user from the pool and removes `mm:state` (no `free` sentinel — absent key means idle). */
  async remove(userId: string): Promise<void> {
    const redis = getRedis();

    const pipeline = redis.pipeline();
    pipeline.zrem(redisKeys.poolGlobal(), userId);
    pipeline.del(redisKeys.userState(userId));
    await pipeline.exec();
  }

  async getCandidates(requesterId: string): Promise<MatchCandidate[]> {
    const redis = getRedis();
    const rows = await redis.zrevrange(redisKeys.poolGlobal(), 0, CANDIDATE_SCAN_LIMIT - 1, "WITHSCORES");

    const candidates: MatchCandidate[] = [];
    for (let index = 0; index < rows.length; index += 2) {
      const userId = rows[index];
      const scoreRaw = rows[index + 1];

      if (!userId || !scoreRaw || userId === requesterId) {
        continue;
      }

      const state = await redis.get(redisKeys.userState(userId));
      if (state !== "searching") {
        continue;
      }

      candidates.push({
        userId,
        score: Number(scoreRaw),
      });

      if (candidates.length >= MAX_CANDIDATES) {
        break;
      }
    }

    return candidates;
  }
}
