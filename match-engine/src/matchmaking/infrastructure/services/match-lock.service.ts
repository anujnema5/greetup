import { MATCH_CONFIG } from "@/config/constants";
import { getRedis } from "@/redis/client";
import { redisKeys } from "@/redis/keys";
import { redisScripts } from "@/redis/scripts";

const orderedUserIds = (userA: string, userB: string): [string, string] => {
  return userA <= userB ? [userA, userB] : [userB, userA];
};

export class MatchLockService {
  async tryLockPair(userA: string, userB: string, attemptId: string): Promise<boolean> {
    const redis = getRedis();
    const [lowUserId, highUserId] = orderedUserIds(userA, userB);
    const result = await redis.eval(
      redisScripts.lockPair,
      5,
      redisKeys.userLock(lowUserId),
      redisKeys.userLock(highUserId),
      redisKeys.pairLock(lowUserId, highUserId),
      redisKeys.userState(lowUserId),
      redisKeys.userState(highUserId),
      attemptId,
      String(MATCH_CONFIG.lockTtlMs),
      "searching",
      "locked",
    );

    return Number(result) === 1;
  }

  async releasePair(userA: string, userB: string): Promise<void> {
    const redis = getRedis();
    const [lowUserId, highUserId] = orderedUserIds(userA, userB);
    const pipeline = redis.pipeline();
    pipeline.del(redisKeys.pairLock(lowUserId, highUserId));
    pipeline.del(redisKeys.userLock(lowUserId));
    pipeline.del(redisKeys.userLock(highUserId));
    pipeline.set(redisKeys.userState(lowUserId), "searching");
    pipeline.set(redisKeys.userState(highUserId), "searching");
    await pipeline.exec();
  }
}
