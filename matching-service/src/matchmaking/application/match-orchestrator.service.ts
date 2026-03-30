import type { FindMatchRequest, FindMatchResult, SnapshotUserProfile } from "@/contracts/matchmaking.contracts";
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
import { MatchWebhookService } from "@/matchmaking/infrastructure/services/match-webhook.service";

const sleep = async (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

const randomJitter = (): number => Math.floor(Math.random() * 250);

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
    private readonly webhook = new MatchWebhookService(),
  ) { }

  async findMatch(request: FindMatchRequest): Promise<FindMatchResult> {
    return this.startFindMatch(request);
  }

  async startFindMatch(request: FindMatchRequest): Promise<FindMatchResult> {
    logger.info("[startFindMatch] received", { userId: request.userId, requestId: request.requestId });

    const existingAttempt = await this.attempts.getAttempt(request.requestId);
    if (existingAttempt) {
      logger.info("[startFindMatch] duplicate requestId — returning existing attempt", { requestId: request.requestId, status: existingAttempt.status });
      return this.attempts.toResult(existingAttempt);
    }

    const requesterSnapshot = await this.getSnapshotWithHydration(request.userId);
    if (!requesterSnapshot) {
      logger.warn("[startFindMatch] no profile snapshot found — marking no_match", { userId: request.userId });
      await this.attempts.markNoMatch(request.requestId, request.userId, "snapshot_not_found");
      return { status: "no_match", reason: "snapshot_not_found" };
    }

    const state = await getRedis().get(redisKeys.userState(request.userId));
    logger.debug("[startFindMatch] current user state", { userId: request.userId, state });
    if (state === "locked" || state === "in_room") {
      logger.warn("[startFindMatch] user unavailable", { userId: request.userId, state });
      await this.attempts.markNoMatch(request.requestId, request.userId, "user_unavailable");
      return { status: "no_match", reason: "user_unavailable" };
    }

    await this.attempts.setSearching(request.requestId, request.userId);
    await this.pool.enqueue(request.userId);
    await this.jobs.enqueue(request);

    logger.info("[startFindMatch] user enqueued successfully", { userId: request.userId, requestId: request.requestId });
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
    logger.info("[processMatchRequest] processing job", { userId: request.userId, requestId: request.requestId });

    const existingAttempt = await this.attempts.getAttempt(request.requestId);
    if (!existingAttempt || existingAttempt.status !== "searching") {
      logger.warn("[processMatchRequest] attempt not in searching state — skipping", { requestId: request.requestId, status: existingAttempt?.status ?? "not_found" });
      return existingAttempt ? this.attempts.toResult(existingAttempt) : { status: "no_match", reason: "attempt_not_found" };
    }

    const requesterSnapshot = await this.getSnapshotWithHydration(request.userId);
    if (!requesterSnapshot) {
      logger.warn("[processMatchRequest] no profile snapshot — marking no_match", { userId: request.userId });
      await this.attempts.markNoMatch(request.requestId, request.userId, "snapshot_not_found");
      await this.pool.remove(request.userId);
      return { status: "no_match", reason: "snapshot_not_found" };
    }

    const state = await getRedis().get(redisKeys.userState(request.userId));
    if (state === "in_room") {
      logger.warn("[processMatchRequest] user already in room — marking no_match", { userId: request.userId });
      await this.attempts.markNoMatch(request.requestId, request.userId, "user_unavailable");
      await this.pool.remove(request.userId);
      return { status: "no_match", reason: "user_unavailable" };
    }

    // Track whether any eligible (above-threshold) candidate was found across all retries.
    // If none are ever found, we fall back to the best compatible candidate regardless of score.
    let foundEligibleCandidate = false;
    let poolHadOtherSearchers = false;

    for (let retryIndex = 0; retryIndex <= MATCH_CONFIG.maxRetries; retryIndex += 1) {
      const candidates = await this.pool.getCandidates(request.userId);
      if (candidates.length > 0) poolHadOtherSearchers = true;
      logger.debug("[processMatchRequest] retry scan", { userId: request.userId, retryIndex, candidateCount: candidates.length });

      const scoredCandidates: Array<{ userId: string; matchScore: number; poolScore: number }> = [];

      for (const candidate of candidates) {
        const candidateSnapshot = await this.getSnapshotWithHydration(candidate.userId);
        if (!candidateSnapshot) {
          logger.debug("[processMatchRequest] skipping candidate — no snapshot", { candidateId: candidate.userId });
          continue;
        }

        const isCompatible = this.validator.isBidirectionallyCompatible(
          requesterSnapshot,
          candidateSnapshot,
        );
        if (!isCompatible) {
          logger.debug("[processMatchRequest] skipping candidate — not compatible", { candidateId: candidate.userId });
          continue;
        }

        const matchScore = this.scorer.calculateBidirectionalScore(requesterSnapshot, candidateSnapshot);
        if (!this.scorer.isScoreEligible(matchScore)) {
          logger.debug("[processMatchRequest] skipping candidate — score below threshold", { candidateId: candidate.userId, matchScore });
          continue;
        }

        foundEligibleCandidate = true;
        scoredCandidates.push({
          userId: candidate.userId,
          matchScore,
          poolScore: candidate.score,
        });
      }

      logger.debug("[processMatchRequest] scored candidates", { userId: request.userId, retryIndex, scoredCount: scoredCandidates.length });

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
          void this.webhook.notifyMatchCompleted({
            attemptId: request.requestId,
            userA: request.userId,
            userB: candidate.userId,
            roomId: roomResult.roomId,
            matchScore: candidate.matchScore,
            isFallbackMatch: false,
          });
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
        const backoffBase = MATCH_CONFIG.retryBackoffMs[retryIndex] ??
          MATCH_CONFIG.retryBackoffMs[MATCH_CONFIG.retryBackoffMs.length - 1] ??
          500;
        await sleep(backoffBase + randomJitter());
      }
    }

    // Fallback: no above-threshold candidate was found across all retries.
    // Try to match with the best compatible candidate regardless of score —
    // a low-quality match is better than no match at all.
    if (!foundEligibleCandidate) {
      const fallbackResult = await this.tryFallbackMatch(request, requesterSnapshot);
      if (fallbackResult) return fallbackResult;
    }

    const noMatchReason = !poolHadOtherSearchers ? "pool_empty" : "no_compatible_candidate";

    logger.warn("[processMatchRequest] exhausted all retries — no compatible candidate found", {
      userId: request.userId,
      requestId: request.requestId,
      foundEligibleCandidate,
      noMatchReason,
    });
    await this.attempts.markNoMatch(request.requestId, request.userId, noMatchReason);
    await this.pool.remove(request.userId);
    void this.webhook.notifyMatchFailed({
      attemptId: request.requestId,
      userId: request.userId,
      reason: noMatchReason,
    });
    return { status: "no_match", reason: noMatchReason };
  }

  private async getSnapshotWithHydration(userId: string): Promise<SnapshotUserProfile | null> {
    const existing = await this.snapshots.getByUserId(userId);
    if (existing) return existing;

    const ok = await this.webhook.requestEnsureProfileSnapshot(userId);
    if (!ok) return null;

    return this.snapshots.getByUserId(userId);
  }

  private async tryFallbackMatch(
    request: FindMatchRequest,
    requesterSnapshot: SnapshotUserProfile,
  ): Promise<FindMatchResult | null> {
    const candidates = await this.pool.getCandidates(request.userId);
    const scoredCandidates: Array<{ userId: string; matchScore: number; poolScore: number }> = [];

    for (const candidate of candidates) {
      const candidateSnapshot = await this.getSnapshotWithHydration(candidate.userId);
      if (!candidateSnapshot) continue;

      const isCompatible = this.validator.isBidirectionallyCompatible(
        requesterSnapshot,
        candidateSnapshot,
      );
      if (!isCompatible) continue;

      // No score threshold — accept any compatible candidate (overlap still boosts score upstream).
      const matchScore = this.scorer.calculateBidirectionalScore(requesterSnapshot, candidateSnapshot);
      scoredCandidates.push({ userId: candidate.userId, matchScore, poolScore: candidate.score });
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
      if (!locked) continue;

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
        void this.webhook.notifyMatchCompleted({
          attemptId: request.requestId,
          userA: request.userId,
          userB: candidate.userId,
          roomId: roomResult.roomId,
          matchScore: candidate.matchScore,
          isFallbackMatch: true,
        });
        logger.info("Fallback match made below score threshold", {
          attemptId: request.requestId,
          requesterId: request.userId,
          candidateId: candidate.userId,
          matchScore: candidate.matchScore,
        });
        return {
          status: "matched",
          roomId: roomResult.roomId,
          peerUserId: candidate.userId,
          matchScore: candidate.matchScore,
        };
      }

      await this.lock.releasePair(request.userId, candidate.userId);
      logger.warn("Room creation failed in fallback; released pair", {
        attemptId: request.requestId,
        requesterId: request.userId,
        candidateId: candidate.userId,
        reason: roomResult.reason,
      });
    }

    return null;
  }

  private async markPairInRoom(userA: string, userB: string): Promise<void> {
    const redis = getRedis();
    const pipeline = redis.pipeline();
    pipeline.zrem(redisKeys.poolGlobal(), userA);
    pipeline.zrem(redisKeys.poolGlobal(), userB);
    pipeline.del(redisKeys.userLock(userA));
    pipeline.del(redisKeys.userLock(userB));
    pipeline.del(redisKeys.pairLock(userA, userB));
    // TTL of 7200s (2h) as a failsafe so users don't get stuck if leaveRoom is never called
    pipeline.set(redisKeys.userState(userA), "in_room", "EX", 7200);
    pipeline.set(redisKeys.userState(userB), "in_room", "EX", 7200);
    await pipeline.exec();
  }

  /** Clears match state when the user leaves the room (or any stale `free`/`in_room` left behind). */
  async leaveRoom(userId: string): Promise<void> {
    const redis = getRedis();
    const requestId = await redis.get(redisKeys.userLastAttempt(userId));
    if (requestId) {
      const attempt = await this.attempts.getAttempt(requestId);
      if (attempt?.status === "matched") {
        await this.attempts.markNoMatch(requestId, userId, "left_room");
      }
    }

    const pipeline = redis.pipeline();
    pipeline.zrem(redisKeys.poolGlobal(), userId);
    pipeline.del(redisKeys.userLock(userId));
    pipeline.del(redisKeys.userState(userId));
    await pipeline.exec();
    logger.info("[leaveRoom] user match state removed", { userId });
  }

  async getUserMatchState(userId: string): Promise<{
    status: "searching" | "matched" | "no_match" | "idle";
    requestId?: string;
    roomId?: string;
  }> {
    const requestId = await getRedis().get(redisKeys.userLastAttempt(userId));
    if (!requestId) {
      logger.debug("[getUserMatchState] no last attempt found", { userId });
      return { status: "idle" };
    }

    const attempt = await this.attempts.getAttempt(requestId);
    if (!attempt) {
      logger.debug("[getUserMatchState] attempt record missing", { userId, requestId });
      return { status: "idle" };
    }

    logger.debug("[getUserMatchState] found attempt", { userId, requestId, status: attempt.status, roomId: attempt.roomId });

    if (attempt.status === "searching") return { status: "searching", requestId };
    if (attempt.status === "matched" && attempt.roomId) return { status: "matched", requestId, roomId: attempt.roomId };
    return { status: "idle" };
  }

  async cancelMatch(userId: string): Promise<void> {
    const redis = getRedis();
    const requestId = await redis.get(redisKeys.userLastAttempt(userId));
    logger.info("[cancelMatch] cancelling match for user", { userId, requestId: requestId ?? "none" });
    await this.pool.remove(userId);
    if (requestId) {
      await this.attempts.markNoMatch(requestId, userId, "cancelled_by_user");
    }
    logger.info("[cancelMatch] done", { userId });
  }
}
