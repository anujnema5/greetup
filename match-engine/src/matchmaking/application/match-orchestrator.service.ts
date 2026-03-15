import type { FindMatchRequest, FindMatchResult } from "@/contracts/matchmaking.contracts";
import { MATCH_CONFIG } from "@/config/constants";
import { logger } from "@/core/logger";
import { getRedis } from "@/redis/client";
import { redisKeys } from "@/redis/keys";
import { MatchValidatorService } from "@/matchmaking/domain/match-validator.service";
import { MatchScoreService } from "@/matchmaking/domain/match-score.service";
import { MatchLockService } from "@/matchmaking/infrastructure/services/match-lock.service";
import { MatchPoolService } from "@/matchmaking/infrastructure/services/match-pool.service";
import { MatchJobQueueService } from "@/matchmaking/infrastructure/services/match-job-queue.service";
import { SnapshotRepository } from "@/matchmaking/infrastructure/repositories/snapshot.repository";
import { MatchAttemptRepository } from "@/matchmaking/infrastructure/repositories/match-attempt.repository";
import { RoomOrchestrationService } from "@/matchmaking/infrastructure/services/room-orchestration.service";

const sleep = async (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

const randomJitter = (): number => Math.floor(Math.random() * 250);

const hasSharedMatchId = (left: string[], right: string[]): boolean => {
  if (left.length === 0 || right.length === 0) return false;
  const rightSet = new Set(right);
  return left.some((id) => rightSet.has(id));
};

export class MatchOrchestratorService {
  constructor(
    private readonly pool = new MatchPoolService(),
    private readonly validator = new MatchValidatorService(),
    private readonly scorer = new MatchScoreService(),
    private readonly jobs = new MatchJobQueueService(),
    private readonly lock = new MatchLockService(),
    private readonly snapshots = new SnapshotRepository(),
    private readonly attempts = new MatchAttemptRepository(),
    private readonly rooms = new RoomOrchestrationService(),
  ) {}

  async findMatch(request: FindMatchRequest): Promise<FindMatchResult> {
    return this.startFindMatch(request);
  }

  async startFindMatch(request: FindMatchRequest): Promise<FindMatchResult> {
    const existingAttempt = await this.attempts.getAttempt(request.requestId);
    if (existingAttempt) {
      return this.attempts.toResult(existingAttempt);
    }

    const requesterSnapshot = await this.snapshots.getByUserId(request.userId);
    if (!requesterSnapshot) {
      await this.attempts.markNoMatch(request.requestId, request.userId, "snapshot_not_found");
      return { status: "no_match", reason: "snapshot_not_found" };
    }

    const state = await getRedis().get(redisKeys.userState(request.userId));
    if (state === "locked" || state === "in_room") {
      await this.attempts.markNoMatch(request.requestId, request.userId, "user_unavailable");
      return { status: "no_match", reason: "user_unavailable" };
    }

    await this.attempts.setSearching(request.requestId, request.userId);
    await this.pool.enqueue(request.userId);
    await this.jobs.enqueue(request);

    return {
      status: "searching",
      retryAfterMs: 1_000,
    };
  }

  async getMatchResult(requestId: string): Promise<FindMatchResult> {
    const existingAttempt = await this.attempts.getAttempt(requestId);
    if (!existingAttempt) {
      return { status: "no_match", reason: "attempt_not_found" };
    }
    return this.attempts.toResult(existingAttempt);
  }

  async processMatchRequest(request: FindMatchRequest): Promise<FindMatchResult> {
    const existingAttempt = await this.attempts.getAttempt(request.requestId);
    if (!existingAttempt || existingAttempt.status !== "searching") {
      return existingAttempt ? this.attempts.toResult(existingAttempt) : { status: "no_match", reason: "attempt_not_found" };
    }

    const requesterSnapshot = await this.snapshots.getByUserId(request.userId);
    if (!requesterSnapshot) {
      await this.attempts.markNoMatch(request.requestId, request.userId, "snapshot_not_found");
      await this.pool.remove(request.userId);
      return { status: "no_match", reason: "snapshot_not_found" };
    }

    const state = await getRedis().get(redisKeys.userState(request.userId));
    if (state === "in_room") {
      await this.attempts.markNoMatch(request.requestId, request.userId, "user_unavailable");
      await this.pool.remove(request.userId);
      return { status: "no_match", reason: "user_unavailable" };
    }

    for (let retryIndex = 0; retryIndex <= MATCH_CONFIG.maxRetries; retryIndex += 1) {
      const candidates = await this.pool.getCandidates(request.userId);
      const scoredCandidates: Array<{ userId: string; matchScore: number; poolScore: number }> = [];

      for (const candidate of candidates) {
        const candidateSnapshot = await this.snapshots.getByUserId(candidate.userId);
        if (!candidateSnapshot) {
          continue;
        }

        if (!hasSharedMatchId(requesterSnapshot.matchIds, candidateSnapshot.matchIds)) {
          continue;
        }

        const isCompatible = this.validator.isBidirectionallyCompatible(
          requesterSnapshot,
          candidateSnapshot,
        );
        if (!isCompatible) {
          continue;
        }

        const matchScore = this.scorer.calculateBidirectionalScore(requesterSnapshot, candidateSnapshot);
        if (!this.scorer.isScoreEligible(matchScore)) {
          continue;
        }

        scoredCandidates.push({
          userId: candidate.userId,
          matchScore,
          poolScore: candidate.score,
        });
      }

      scoredCandidates.sort((a, b) => {
        if (a.matchScore !== b.matchScore) return b.matchScore - a.matchScore;
        return b.poolScore - a.poolScore;
      });

      for (const candidate of scoredCandidates) {

        const locked = await this.lock.tryLockPair(
          request.userId,
          candidate.userId,
          request.requestId,
        );
        if (!locked) {
          continue;
        }

        const roomResult = await this.rooms.createRoom({
          attemptId: request.requestId,
          requesterId: request.userId,
          peerUserId: candidate.userId,
          timeoutMs: MATCH_CONFIG.roomCreateTimeoutMs,
        });

        if (roomResult.ok) {
          await this.markPairInRoom(request.userId, candidate.userId);
          await this.attempts.markMatched(
            request.requestId,
            request.userId,
            candidate.userId,
            roomResult.roomId,
            candidate.matchScore,
          );
          return {
            status: "matched",
            roomId: roomResult.roomId,
            peerUserId: candidate.userId,
            matchScore: candidate.matchScore,
          };
        }

        await this.lock.releasePair(request.userId, candidate.userId);
        logger.warn("Room creation failed after lock; released pair", {
          attemptId: request.requestId,
          requesterId: request.userId,
          candidateId: candidate.userId,
          reason: roomResult.reason,
        });
      }

      if (retryIndex < MATCH_CONFIG.maxRetries) {
        const backoffBase =
          MATCH_CONFIG.retryBackoffMs[retryIndex] ??
          MATCH_CONFIG.retryBackoffMs[MATCH_CONFIG.retryBackoffMs.length - 1] ??
          500;
        await sleep(backoffBase + randomJitter());
      }
    }

    await this.attempts.markNoMatch(request.requestId, request.userId, "no_compatible_candidate");
    await this.pool.remove(request.userId);
    return { status: "no_match", reason: "no_compatible_candidate" };
  }

  private async markPairInRoom(userA: string, userB: string): Promise<void> {
    const redis = getRedis();
    const pipeline = redis.pipeline();
    pipeline.zrem(redisKeys.poolGlobal(), userA);
    pipeline.zrem(redisKeys.poolGlobal(), userB);
    pipeline.del(redisKeys.userLock(userA));
    pipeline.del(redisKeys.userLock(userB));
    pipeline.del(redisKeys.pairLock(userA, userB));
    pipeline.set(redisKeys.userState(userA), "in_room");
    pipeline.set(redisKeys.userState(userB), "in_room");
    await pipeline.exec();
  }
}
