import { MATCH_CONFIG } from "@/config/constants";
import { getRedis } from "@/redis/client";
import { redisKeys } from "@/redis/keys";
import { redisScripts } from "@/redis/scripts";

export type PairPendingRecord = {
  userLow: string;
  userHigh: string;
  attemptLow: string;
  attemptHigh: string;
  matchScore: number;
  isFallbackMatch: boolean;
  roomAttemptId: string;
};

const ordered = (a: string, b: string): [string, string] => (a <= b ? [a, b] : [b, a]);

export class MatchProposalService {
  async writePending(record: PairPendingRecord): Promise<void> {
    const redis = getRedis();
    const key = redisKeys.pairPending(record.userLow, record.userHigh);
    const ttlSec = Math.ceil(MATCH_CONFIG.proposalPhaseLockTtlMs / 1000);
    await redis.hset(key, {
      userLow: record.userLow,
      userHigh: record.userHigh,
      attemptLow: record.attemptLow,
      attemptHigh: record.attemptHigh,
      matchScore: String(record.matchScore),
      isFallbackMatch: record.isFallbackMatch ? "1" : "0",
      roomAttemptId: record.roomAttemptId,
      connectLow: "",
      connectHigh: "",
    });
    await redis.expire(key, ttlSec);
  }

  async readPending(userA: string, userB: string): Promise<PairPendingRecord | null> {
    const [low, high] = ordered(userA, userB);
    const redis = getRedis();
    const raw = await redis.hgetall(redisKeys.pairPending(low, high));
    if (!raw.userLow || !raw.userHigh || !raw.attemptLow || !raw.attemptHigh) {
      return null;
    }
    const matchScore = Number(raw.matchScore);
    return {
      userLow: raw.userLow,
      userHigh: raw.userHigh,
      attemptLow: raw.attemptLow,
      attemptHigh: raw.attemptHigh,
      matchScore: Number.isFinite(matchScore) ? matchScore : 0,
      isFallbackMatch: raw.isFallbackMatch === "1",
      roomAttemptId: raw.roomAttemptId ?? raw.attemptLow,
    };
  }

  async deletePending(userA: string, userB: string): Promise<void> {
    const redis = getRedis();
    const [low, high] = ordered(userA, userB);
    await redis.del(redisKeys.pairPending(low, high), redisKeys.pairConnectFinalize(low, high));
  }

  /**
   * @returns 0 = waiting for peer, 1 = peer is finalizing room, 2 = this caller should create the room
   */
  async recordConnect(userA: string, userB: string, connectingUserId: string): Promise<0 | 1 | 2> {
    const [low, high] = ordered(userA, userB);
    const field = connectingUserId === low ? "connectLow" : "connectHigh";
    const redis = getRedis();
    const result = await redis.eval(
      redisScripts.recordProposalConnect,
      2,
      redisKeys.pairPending(low, high),
      redisKeys.pairConnectFinalize(low, high),
      field,
      String(MATCH_CONFIG.connectFinalizeLockTtlSeconds),
    );
    const n = Number(result);
    if (n === 1 || n === 2) return n as 1 | 2;
    return 0;
  }
}
