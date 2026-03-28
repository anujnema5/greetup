import type { FindMatchResult } from "@/contracts/matchmaking.contracts";
import { MATCH_CONFIG } from "@/config/constants";
import { getRedis } from "@/redis/client";
import { redisKeys } from "@/redis/keys";

type AttemptStatus = "searching" | "matched" | "no_match";

type AttemptRecord = {
  attemptId: string;
  userId: string;
  status: AttemptStatus;
  roomId: string | null;
  peerUserId: string | null;
  matchScore: number | null;
  reason: string | null;
  createdAt: number;
  updatedAt: number;
};

const parseAttemptRecord = (payload: Record<string, string>, fallbackAttemptId: string): AttemptRecord => {
  const now = Date.now();
  const createdAt = Number(payload.createdAt ?? now);
  const updatedAt = Number(payload.updatedAt ?? now);
  const matchScoreRaw = payload.matchScore ? Number(payload.matchScore) : null;
  const status = payload.status as AttemptStatus;

  return {
    attemptId: payload.attemptId ?? fallbackAttemptId,
    userId: payload.userId ?? "",
    status: status === "matched" || status === "no_match" ? status : "searching",
    roomId: payload.roomId ?? null,
    peerUserId: payload.peerUserId ?? null,
    matchScore: matchScoreRaw !== null && Number.isFinite(matchScoreRaw) ? matchScoreRaw : null,
    reason: payload.reason ?? null,
    createdAt: Number.isFinite(createdAt) ? createdAt : now,
    updatedAt: Number.isFinite(updatedAt) ? updatedAt : now,
  };
};

export class MatchAttemptRepository {
  async getAttempt(attemptId: string): Promise<AttemptRecord | null> {
    const redis = getRedis();
    const raw = await redis.hgetall(redisKeys.attempt(attemptId));
    if (Object.keys(raw).length === 0) {
      return null;
    }
    return parseAttemptRecord(raw, attemptId);
  }

  async setSearching(attemptId: string, userId: string): Promise<void> {
    const redis = getRedis();
    const key = redisKeys.attempt(attemptId);
    const now = Date.now().toString();
    await redis.hset(
      key,
      "attemptId",
      attemptId,
      "userId",
      userId,
      "status",
      "searching",
      "createdAt",
      now,
      "updatedAt",
      now,
    );
    await redis.expire(key, MATCH_CONFIG.attemptTtlSeconds);
    await redis.set(redisKeys.userLastAttempt(userId), attemptId, "EX", MATCH_CONFIG.attemptTtlSeconds);
  }

  async markMatched(
    attemptId: string,
    userId: string,
    peerUserId: string,
    roomId: string,
    matchScore: number,
  ): Promise<void> {
    const redis = getRedis();
    const key = redisKeys.attempt(attemptId);
    await redis.hset(
      key,
      "attemptId",
      attemptId,
      "userId",
      userId,
      "status",
      "matched",
      "peerUserId",
      peerUserId,
      "matchScore",
      String(matchScore),
      "roomId",
      roomId,
      "updatedAt",
      Date.now().toString(),
    );
    await redis.expire(key, MATCH_CONFIG.attemptTtlSeconds);
    await redis.set(redisKeys.userLastAttempt(userId), attemptId, "EX", MATCH_CONFIG.attemptTtlSeconds);
  }

  async markNoMatch(attemptId: string, userId: string, reason: string): Promise<void> {
    const redis = getRedis();
    const key = redisKeys.attempt(attemptId);
    await redis.hset(
      key,
      "attemptId",
      attemptId,
      "userId",
      userId,
      "status",
      "no_match",
      "reason",
      reason,
      "updatedAt",
      Date.now().toString(),
    );
    await redis.expire(key, MATCH_CONFIG.attemptTtlSeconds);
    await redis.set(redisKeys.userLastAttempt(userId), attemptId, "EX", MATCH_CONFIG.attemptTtlSeconds);
  }

  toResult(record: AttemptRecord): FindMatchResult {
    if (record.status === "matched" && record.roomId && record.peerUserId) {
      return {
        status: "matched",
        roomId: record.roomId,
        peerUserId: record.peerUserId,
        matchScore: record.matchScore ?? 0,
      };
    }

    if (record.status === "no_match") {
      return {
        status: "no_match",
        reason: record.reason ?? "no_match",
      };
    }

    return {
      status: "searching",
      retryAfterMs: 1_000,
    };
  }
}
