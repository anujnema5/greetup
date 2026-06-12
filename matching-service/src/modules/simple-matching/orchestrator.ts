import type { FindMatchRequest, FindMatchResult, SnapshotUserProfile } from "@/modules/simple-matching/types";
import type { PairPendingRecord } from "@/modules/simple-matching/proposal/proposal";
import { MATCH_CONFIG } from "@/shared/config/constants";
import { randomJitter, sleep } from "@/shared/async";
import { logger } from "@/core/logging";
import {
  coalesceActiveSearchOrProposal,
  releaseStartSearchLockIfHolder,
  searchingWithRequestId,
  sortScoredCandidatesDescending,
  START_SEARCH_LOCK_POLL_MS,
  START_SEARCH_LOCK_WAIT_MS,
  tryAcquireStartSearchLock,
} from "@/modules/simple-matching/helpers";
import { MatchValidatorService } from "@/modules/simple-matching/scoring/validator";
import { MatchScoreService } from "@/modules/simple-matching/scoring/scorer";
import type { MatchCandidate, ScoredMatchCandidate } from "@/modules/simple-matching/types";
import { MatchLockService } from "@/modules/simple-matching/pool/lock";
import { MatchPoolService } from "@/modules/simple-matching/pool/pool";
import { MatchJobQueueService } from "@/modules/simple-matching/queue";
import { SnapshotRepository } from "@/modules/simple-matching/repositories/snapshot";
import { MatchAttemptRepository } from "@/modules/simple-matching/repositories/attempt";
import { RoomOrchestrationService } from "@/modules/simple-matching/room";
import { MatchProposalService } from "@/modules/simple-matching/proposal/proposal";
import { MatchSkipPeersService } from "@/modules/simple-matching/proposal/skip-peers";
import { MatchWebhookService } from "@/modules/simple-matching/webhook";
import { isBlockedWithPeer } from "@/modules/simple-matching/blocks/blocked-peers";
import {
  orderCandidatesForStrategy,
  resolveMatchExecutionStrategy,
  type CandidateScoringMode,
  type MatchExecutionStrategy,
} from "@/modules/simple-matching/strategy";
import { getRedis } from "@/core/redis/client";
import { redisKeys } from "@/core/redis/keys";
import {
  areGuestPoolCompatible,
  resolveGuestMatchPoolPolicy,
} from "@/modules/simple-matching/guest/guest-match-pool";

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
    private readonly proposals = new MatchProposalService(),
    private readonly skipPeers = new MatchSkipPeersService(),
    private readonly webhook = new MatchWebhookService(),
  ) { }

  /** Persist searching attempt, pool membership, and worker job — shared by lock and fallback paths. */
  private async commitSearchingEnqueue(request: FindMatchRequest): Promise<FindMatchResult> {
    await this.attempts.setSearching(request.requestId, request.userId);
    await this.pool.enqueue(request.userId);
    await this.jobs.enqueue(request);
    logger.info("[startFindMatch] user enqueued successfully", {
      userId: request.userId,
      requestId: request.requestId,
    });
    return searchingWithRequestId(request.requestId);
  }

  async findMatch(request: FindMatchRequest): Promise<FindMatchResult> {
    return this.startFindMatch(request);
  }

  async startFindMatch(request: FindMatchRequest): Promise<FindMatchResult> {
    logger.info("[startFindMatch] received", { userId: request.userId, requestId: request.requestId });

    const existingAttempt = await this.attempts.getAttempt(request.requestId);
    if (existingAttempt) {
      logger.info("[startFindMatch] duplicate requestId — returning existing attempt", {
        requestId: request.requestId,
        status: existingAttempt.status,
      });
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
    if (state === "locked") {
      const lastId = await getRedis().get(redisKeys.userLastAttempt(request.userId));
      if (lastId) {
        const lockedAttempt = await this.attempts.getAttempt(lastId);
        if (lockedAttempt?.status === "proposed" && lockedAttempt.peerUserId) {
          logger.info("[startFindMatch] idempotent — already in match proposal", { userId: request.userId, requestId: lastId });
          return this.attempts.toResult(lockedAttempt);
        }
      }
      logger.warn("[startFindMatch] user unavailable (locked)", { userId: request.userId });
      await this.attempts.markNoMatch(request.requestId, request.userId, "user_unavailable");
      return { status: "no_match", reason: "user_unavailable" };
    }
    if (state === "in_room") {
      logger.warn("[startFindMatch] user unavailable", { userId: request.userId, state });
      await this.attempts.markNoMatch(request.requestId, request.userId, "user_unavailable");
      return { status: "no_match", reason: "user_unavailable" };
    }

    const coalescedEarly = await coalesceActiveSearchOrProposal(this.attempts, request.userId);
    if (coalescedEarly) return coalescedEarly;

    const deadline = Date.now() + START_SEARCH_LOCK_WAIT_MS;
    while (Date.now() < deadline) {
      const coalesced = await coalesceActiveSearchOrProposal(this.attempts, request.userId);
      if (coalesced) return coalesced;

      const acquired = await tryAcquireStartSearchLock(request.userId, request.requestId);
      if (acquired) {
        try {
          const again = await coalesceActiveSearchOrProposal(this.attempts, request.userId);
          if (again) return again;
          return await this.commitSearchingEnqueue(request);
        } finally {
          await releaseStartSearchLockIfHolder(request.userId, request.requestId);
        }
      }
      await sleep(START_SEARCH_LOCK_POLL_MS);
    }

    const finalCoalesce = await coalesceActiveSearchOrProposal(this.attempts, request.userId);
    if (finalCoalesce) return finalCoalesce;

    logger.warn("[startFindMatch] start-search lock wait exhausted — proceeding without lock", {
      userId: request.userId,
      requestId: request.requestId,
    });
    return this.commitSearchingEnqueue(request);
  }

  async getMatchResult(requestId: string): Promise<FindMatchResult> {
    const existingAttempt = await this.attempts.getAttempt(requestId);
    if (!existingAttempt) {
      logger.debug("[getMatchResult] attempt not found", { requestId });
      return { status: "no_match", reason: "attempt_not_found" };
    }
    const result = this.attempts.toResult(existingAttempt);
    logger.debug("[getMatchResult] returning cached attempt state", {
      requestId,
      resultStatus: result.status,
      attemptStatus: existingAttempt.status,
    });
    return result;
  }

  async processMatchRequest(request: FindMatchRequest): Promise<FindMatchResult> {
    logger.info("[processMatchRequest] processing job", { userId: request.userId, requestId: request.requestId });

    const existingAttempt = await this.attempts.getAttempt(request.requestId);
    if (!existingAttempt || existingAttempt.status !== "searching") {
      logger.warn("[processMatchRequest] attempt not in searching state — skipping", {
        requestId: request.requestId,
        status: existingAttempt?.status ?? "not_found",
      });
      return existingAttempt ? this.attempts.toResult(existingAttempt) : { status: "no_match", reason: "attempt_not_found" };
    }

    const requesterSnapshot = await this.getSnapshotWithHydration(request.userId);
    if (!requesterSnapshot) {
      logger.warn("[processMatchRequest] no profile snapshot — marking no_match", { userId: request.userId });
      await this.attempts.markNoMatch(request.requestId, request.userId, "snapshot_not_found");
      await this.pool.remove(request.userId);
      return { status: "no_match", reason: "snapshot_not_found" };
    }
    const strategy = resolveMatchExecutionStrategy(requesterSnapshot);
    logger.debug("[processMatchRequest] resolved strategy", {
      userId: request.userId,
      strategyId: strategy.strategyId,
      tier: strategy.tier,
      retryBudget: strategy.retryBudget,
    });

    const state = await getRedis().get(redisKeys.userState(request.userId));
    if (state === "in_room") {
      logger.warn("[processMatchRequest] user already in room — marking no_match", { userId: request.userId });
      await this.attempts.markNoMatch(request.requestId, request.userId, "user_unavailable");
      await this.pool.remove(request.userId);
      return { status: "no_match", reason: "user_unavailable" };
    }

    if (state === "locked") {
      logger.debug("[processMatchRequest] user locked (proposal in progress) — yielding", { userId: request.userId });
      return this.attempts.toResult(existingAttempt);
    }

    let foundEligibleCandidate = false;
    let poolHadOtherSearchers = false;

    const totalRetryPasses = MATCH_CONFIG.maxRetries + strategy.retryBudget;
    for (let retryIndex = 0; retryIndex <= totalRetryPasses; retryIndex += 1) {
      const candidates = await this.pool.getCandidates(request.userId, requesterSnapshot);
      if (candidates.length > 0) poolHadOtherSearchers = true;
      logger.debug("[processMatchRequest] retry scan", { userId: request.userId, retryIndex, candidateCount: candidates.length });

      const scoredCandidates = await this.scoreCandidatesFromPool(
        requesterSnapshot,
        candidates,
        strategy.primaryScoringMode,
      );

      if (scoredCandidates.length > 0) foundEligibleCandidate = true;

      logger.debug("[processMatchRequest] scored candidates", {
        userId: request.userId,
        retryIndex,
        scoredCount: scoredCandidates.length,
        scoredCandidates: scoredCandidates.map((c) => ({ userId: c.userId, matchScore: c.matchScore, poolScore: c.poolScore })),
      });

      sortScoredCandidatesDescending(scoredCandidates);
      const orderedCandidates = orderCandidatesForStrategy(strategy, scoredCandidates);

      const matched = await this.tryPairWithSortedCandidates(request, orderedCandidates, false);
      if (matched) return matched;

      if (retryIndex < totalRetryPasses) {
        const backoffBase =
          MATCH_CONFIG.retryBackoffMs[retryIndex] ??
          MATCH_CONFIG.retryBackoffMs[MATCH_CONFIG.retryBackoffMs.length - 1] ??
          500;
        await sleep(backoffBase + randomJitter());
      }
    }

    if (!foundEligibleCandidate) {
      logger.info("[processMatchRequest] no eligible candidates in any retry — trying fallback", {
        userId: request.userId,
        requestId: request.requestId,
        poolHadOtherSearchers,
      });
      const fallbackResult = await this.tryFallbackMatch(request, requesterSnapshot, strategy);
      if (fallbackResult) {
        logger.info("[processMatchRequest] fallback produced a result", {
          userId: request.userId,
          requestId: request.requestId,
          status: fallbackResult.status,
        });
        return fallbackResult;
      }
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
    if (existing) {
      logger.debug("[getSnapshotWithHydration] cache hit", { userId });
      return existing;
    }

    logger.debug("[getSnapshotWithHydration] cache miss — requesting ensure snapshot", { userId });
    const ok = await this.webhook.requestEnsureProfileSnapshot(userId);
    if (!ok) {
      logger.warn("[getSnapshotWithHydration] ensure snapshot webhook failed or denied", { userId });
      return null;
    }

    const hydrated = await this.snapshots.getByUserId(userId);
    if (!hydrated) {
      logger.warn("[getSnapshotWithHydration] snapshot still missing after ensure", { userId });
    } else {
      logger.debug("[getSnapshotWithHydration] hydrated after webhook", { userId });
    }
    return hydrated;
  }

  private async scoreCandidatesFromPool(
    requesterSnapshot: SnapshotUserProfile,
    poolCandidates: MatchCandidate[],
    mode: CandidateScoringMode,
  ): Promise<ScoredMatchCandidate[]> {
    const logSkips = mode === "eligible_only";
    const skippedPeerIds = await this.skipPeers.getSkippedPeerSet(requesterSnapshot.userId);
    const guestMatchPoolPolicy = resolveGuestMatchPoolPolicy();
    const scoredMaybe = await Promise.all(
      poolCandidates.map(async (candidate): Promise<ScoredMatchCandidate | null> => {
        if (await isBlockedWithPeer(requesterSnapshot.userId, candidate.userId)) {
          if (logSkips) {
            logger.debug("[processMatchRequest] skipping candidate — blocked", {
              candidateId: candidate.userId,
            });
          }
          return null;
        }

        const candidateSnapshot = await this.getSnapshotWithHydration(candidate.userId);
        if (!candidateSnapshot) {
          if (logSkips) {
            logger.debug("[processMatchRequest] skipping candidate — no snapshot", { candidateId: candidate.userId });
          }
          return null;
        }

        if (!areGuestPoolCompatible(requesterSnapshot, candidateSnapshot, guestMatchPoolPolicy)) {
          if (logSkips) {
            logger.debug("[processMatchRequest] skipping candidate — guest pool policy", {
              candidateId: candidate.userId,
              policy: guestMatchPoolPolicy,
            });
          }
          return null;
        }

        if (!this.validator.isBidirectionallyCompatible(requesterSnapshot, candidateSnapshot)) {
          if (logSkips) {
            logger.debug("[processMatchRequest] skipping candidate — not compatible", { candidateId: candidate.userId });
          }
          return null;
        }

        const matchScore = this.scorer.calculateBidirectionalScore(requesterSnapshot, candidateSnapshot);
        if (mode === "eligible_only" && !this.scorer.isScoreEligible(matchScore)) {
          logger.debug("[processMatchRequest] skipping candidate — score below threshold", {
            candidateId: candidate.userId,
            matchScore,
          });
          return null;
        }

        return {
          userId: candidate.userId,
          matchScore,
          poolScore: candidate.score,
        };
      }),
    );
    const out = scoredMaybe.filter((row): row is ScoredMatchCandidate => row !== null);

    if (skippedPeerIds.size === 0) {
      return out;
    }

    const preferred: ScoredMatchCandidate[] = [];
    const deprioritized: ScoredMatchCandidate[] = [];
    for (const row of out) {
      if (skippedPeerIds.has(row.userId)) {
        deprioritized.push(row);
      } else {
        preferred.push(row);
      }
    }
    return [...preferred, ...deprioritized];
  }

  /**
   * Tries to lock and create a room for candidates in rank order.
   * Returns the first successful match, or null if every attempt failed.
   */
  private async tryPairWithSortedCandidates(
    request: FindMatchRequest,
    sorted: ScoredMatchCandidate[],
    isFallbackMatch: boolean,
  ): Promise<FindMatchResult | null> {

    logger.debug("[tryPairWithSortedCandidates] attempting to pair with candidates", {
      userId: request.userId,
      candidateCount: sorted.length,
      isFallbackMatch,
      sortedCandidates: sorted.map((c) => ({ userId: c.userId, matchScore: c.matchScore, poolScore: c.poolScore })),
    });

    for (const candidate of sorted) {
      const locked = await this.lock.tryLockPair(
        request.userId,
        candidate.userId,
        request.requestId,
        MATCH_CONFIG.proposalPhaseLockTtlMs,
      );
      if (!locked) {
        logger.debug("[tryPairWithSortedCandidates] pair lock not acquired — trying next candidate", {
          attemptId: request.requestId,
          requesterId: request.userId,
          candidateId: candidate.userId,
          isFallbackMatch,
        });
        continue;
      }

      logger.debug("[tryPairWithSortedCandidates] pair locked — awaiting mutual Connect", {
        attemptId: request.requestId,
        requesterId: request.userId,
        candidateId: candidate.userId,
        matchScore: candidate.matchScore,
        isFallbackMatch,
      });

      const redis = getRedis();
      const peerAttemptId = await redis.get(redisKeys.userLastAttempt(candidate.userId));
      if (!peerAttemptId || peerAttemptId === request.requestId) {
        logger.warn("[tryPairWithSortedCandidates] peer attempt missing or same as requester — releasing pair", {
          requesterId: request.userId,
          candidateId: candidate.userId,
          peerAttemptId: peerAttemptId ?? null,
        });
        await this.lock.releasePair(request.userId, candidate.userId);
        if (!peerAttemptId) {
          logger.info("[tryPairWithSortedCandidates] evicting stale candidate from pool", {
            candidateId: candidate.userId,
          });
          await this.pool.stripFromPool(candidate.userId);
        }
        continue;
      }

      const peerAttempt = await this.attempts.getAttempt(peerAttemptId);
      if (!peerAttempt || peerAttempt.userId !== candidate.userId || peerAttempt.status !== "searching") {
        logger.warn("[tryPairWithSortedCandidates] peer not in searching state — releasing pair", {
          candidateId: candidate.userId,
          peerAttemptId,
          peerStatus: peerAttempt?.status ?? "none",
        });
        await this.lock.releasePair(request.userId, candidate.userId);
        continue;
      }

      const userLow = request.userId <= candidate.userId ? request.userId : candidate.userId;
      const userHigh = request.userId <= candidate.userId ? candidate.userId : request.userId;
      const attemptLow = userLow === request.userId ? request.requestId : peerAttemptId;
      const attemptHigh = userHigh === request.userId ? request.requestId : peerAttemptId;

      await this.proposals.writePending({
        userLow,
        userHigh,
        attemptLow,
        attemptHigh,
        matchScore: candidate.matchScore,
        isFallbackMatch,
        roomAttemptId: request.requestId,
      });

      await this.attempts.markProposed(
        request.requestId,
        request.userId,
        candidate.userId,
        candidate.matchScore,
        isFallbackMatch,
      );
      await this.attempts.markProposed(
        peerAttemptId,
        candidate.userId,
        request.userId,
        candidate.matchScore,
        isFallbackMatch,
      );

      void this.webhook.notifyMatchProposed({
        userA: request.userId,
        userB: candidate.userId,
        attemptIdA: request.requestId,
        attemptIdB: peerAttemptId,
        matchScore: candidate.matchScore,
        isFallbackMatch,
      });

      logger.info("[tryPairWithSortedCandidates] proposal created — room after mutual Connect", {
        attemptId: request.requestId,
        peerAttemptId,
        requesterId: request.userId,
        candidateId: candidate.userId,
        matchScore: candidate.matchScore,
      });

      return {
        status: "proposed",
        requestId: request.requestId,
        peerUserId: candidate.userId,
        matchScore: candidate.matchScore,
        isFallbackMatch,
      };
    }

    return null;
  }

  private async tryFallbackMatch(
    request: FindMatchRequest,
    requesterSnapshot: SnapshotUserProfile,
    strategy: MatchExecutionStrategy,
  ): Promise<FindMatchResult | null> {
    logger.info("[tryFallbackMatch] starting — no eligible scores in main retries", {
      userId: request.userId,
      requestId: request.requestId,
    });

    const candidates = await this.pool.getCandidates(request.userId, requesterSnapshot);
    logger.debug("[tryFallbackMatch] raw pool candidates", {
      userId: request.userId,
      poolSize: candidates.length,
    });

    const scoredCandidates = await this.scoreCandidatesFromPool(
      requesterSnapshot,
      candidates,
      strategy.fallbackScoringMode,
    );
    sortScoredCandidatesDescending(scoredCandidates);
    const orderedCandidates = orderCandidatesForStrategy(strategy, scoredCandidates);

    if (scoredCandidates.length === 0) {
      logger.warn("[tryFallbackMatch] no all_compatible candidates after scoring — giving up fallback", {
        userId: request.userId,
        requestId: request.requestId,
      });
      return null;
    }

    logger.info("[tryFallbackMatch] attempting pair with relaxed score pool", {
      userId: request.userId,
      requestId: request.requestId,
      candidateCount: orderedCandidates.length,
      strategyId: strategy.strategyId,
      tier: strategy.tier,
    });

    return this.tryPairWithSortedCandidates(request, orderedCandidates, true);
  }

  private async markPairInRoom(userA: string, userB: string): Promise<void> {
    await this.pool.stripFromPool(userA);
    await this.pool.stripFromPool(userB);
    const redis = getRedis();
    const pipeline = redis.pipeline();
    pipeline.del(redisKeys.userLock(userA));
    pipeline.del(redisKeys.userLock(userB));
    pipeline.del(redisKeys.pairLock(userA, userB));
    pipeline.set(redisKeys.userState(userA), "in_room", "EX", MATCH_CONFIG.userInRoomStateTtlSeconds);
    pipeline.set(redisKeys.userState(userB), "in_room", "EX", MATCH_CONFIG.userInRoomStateTtlSeconds);
    await pipeline.exec();
    logger.debug("[markPairInRoom] redis state updated — both users in_room, pool/locks cleared", {
      userA,
      userB,
      inRoomTtlSec: MATCH_CONFIG.userInRoomStateTtlSeconds,
    });
  }

  /** Clears match state when the user leaves the room (or any stale `free`/`in_room` left behind). */
  async leaveRoom(userId: string): Promise<void> {
    const redis = getRedis();
    const requestId = await redis.get(redisKeys.userLastAttempt(userId));
    logger.debug("[leaveRoom] start", { userId, lastAttemptId: requestId ?? null });

    if (requestId) {
      const attempt = await this.attempts.getAttempt(requestId);
      if (attempt?.status === "matched") {
        await this.attempts.markNoMatch(requestId, userId, "left_room");
        logger.info("[leaveRoom] matched attempt marked left_room", { userId, requestId });
      } else {
        logger.debug("[leaveRoom] attempt not matched — skipping markNoMatch", {
          userId,
          requestId,
          status: attempt?.status ?? "none",
        });
      }
    }

    await this.pool.stripFromPool(userId);
    const pipeline = redis.pipeline();
    pipeline.del(redisKeys.userLock(userId));
    pipeline.del(redisKeys.userState(userId));
    await pipeline.exec();
    logger.info("[leaveRoom] user match state removed from redis", { userId });
  }

  async respondToMatchProposal(
    userId: string,
    attemptId: string,
    decision: "connect" | "skip",
  ): Promise<{ ok: true } | { ok: false; error: string }> {
    const attempt = await this.attempts.getAttempt(attemptId);
    if (!attempt || attempt.userId !== userId) {
      return { ok: false, error: "invalid_attempt" };
    }
    if (attempt.status !== "proposed" || !attempt.peerUserId) {
      return { ok: false, error: "not_in_proposal" };
    }

    const peerUserId = attempt.peerUserId;
    const pending = await this.proposals.readPending(userId, peerUserId);
    if (!pending) {
      return { ok: false, error: "proposal_expired" };
    }

    if (decision === "skip") {
      const reasonLow = userId === pending.userLow ? "you_skipped" : "peer_skipped";
      const reasonHigh = userId === pending.userHigh ? "you_skipped" : "peer_skipped";
      await this.teardownProposal({
        pending,
        skipByUserId: userId,
        reasonForUserLow: reasonLow,
        reasonForUserHigh: reasonHigh,
      });
      void this.webhook.notifyMatchProposalCancelled({
        userId: pending.userLow,
        attemptId: pending.attemptLow,
        reason: reasonLow,
      });
      void this.webhook.notifyMatchProposalCancelled({
        userId: pending.userHigh,
        attemptId: pending.attemptHigh,
        reason: reasonHigh,
      });
      return { ok: true };
    }

    const rc = await this.proposals.recordConnect(userId, peerUserId, userId);
    if (rc === 0 || rc === 1) {
      return { ok: true };
    }

    const roomResult = await this.rooms.createRoom({
      attemptId: pending.roomAttemptId,
      requesterId: pending.userLow,
      peerUserId: pending.userHigh,
      timeoutMs: MATCH_CONFIG.roomCreateTimeoutMs,
    });

    if (!roomResult.ok) {
      logger.warn("[respondToMatchProposal] room creation failed after mutual connect", {
        reason: roomResult.reason,
        userLow: pending.userLow,
        userHigh: pending.userHigh,
      });
      await this.proposals.deletePending(pending.userLow, pending.userHigh);
      await this.lock.releasePair(pending.userLow, pending.userHigh);
      await this.attempts.markNoMatch(pending.attemptLow, pending.userLow, "room_create_failed");
      await this.attempts.markNoMatch(pending.attemptHigh, pending.userHigh, "room_create_failed");
      void this.webhook.notifyMatchProposalCancelled({
        userId: pending.userLow,
        attemptId: pending.attemptLow,
        reason: "room_create_failed",
      });
      void this.webhook.notifyMatchProposalCancelled({
        userId: pending.userHigh,
        attemptId: pending.attemptHigh,
        reason: "room_create_failed",
      });
      return { ok: false, error: "room_create_failed" };
    }

    await this.markPairInRoom(pending.userLow, pending.userHigh);
    await this.attempts.markMatched(
      pending.attemptLow,
      pending.userLow,
      pending.userHigh,
      roomResult.roomId,
      pending.matchScore,
    );
    await this.attempts.markMatched(
      pending.attemptHigh,
      pending.userHigh,
      pending.userLow,
      roomResult.roomId,
      pending.matchScore,
    );
    await this.proposals.deletePending(pending.userLow, pending.userHigh);

    void this.webhook.notifyMatchCompleted({
      attemptId: pending.roomAttemptId,
      userA: pending.userLow,
      userB: pending.userHigh,
      roomId: roomResult.roomId,
      matchScore: pending.matchScore,
      isFallbackMatch: pending.isFallbackMatch,
    });

    return { ok: true };
  }

  private async teardownProposal(input: {
    pending: PairPendingRecord;
    skipByUserId: string | null;
    reasonForUserLow: string;
    reasonForUserHigh: string;
  }): Promise<void> {
    const { pending, skipByUserId, reasonForUserLow, reasonForUserHigh } = input;
    if (skipByUserId === pending.userLow) {
      await this.skipPeers.recordSkip(pending.userLow, pending.userHigh);
    } else if (skipByUserId === pending.userHigh) {
      await this.skipPeers.recordSkip(pending.userHigh, pending.userLow);
    }
    await this.proposals.deletePending(pending.userLow, pending.userHigh);
    await this.lock.releasePair(pending.userLow, pending.userHigh);
    await this.attempts.markNoMatch(pending.attemptLow, pending.userLow, reasonForUserLow);
    await this.attempts.markNoMatch(pending.attemptHigh, pending.userHigh, reasonForUserHigh);
  }

  async getUserMatchState(userId: string): Promise<{
    status: "searching" | "proposed" | "matched" | "no_match" | "idle";
    requestId?: string;
    roomId?: string;
    peerUserId?: string;
    matchScore?: number;
    isFallbackMatch?: boolean;
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

    logger.debug("[getUserMatchState] found attempt", {
      userId,
      requestId,
      status: attempt.status,
      roomId: attempt.roomId,
    });

    if (attempt.status === "searching") return { status: "searching", requestId };
    if (attempt.status === "proposed" && attempt.peerUserId) {
      return {
        status: "proposed",
        requestId,
        peerUserId: attempt.peerUserId,
        matchScore: attempt.matchScore ?? 0,
        isFallbackMatch: attempt.isFallbackMatch,
      };
    }
    if (attempt.status === "matched" && attempt.roomId) return { status: "matched", requestId, roomId: attempt.roomId };
    return { status: "idle" };
  }

  async cancelMatch(userId: string): Promise<void> {
    const redis = getRedis();
    const requestId = await redis.get(redisKeys.userLastAttempt(userId));
    logger.info("[cancelMatch] cancelling match for user", { userId, requestId: requestId ?? "none" });
    await this.pool.remove(userId);
    if (requestId) {
      const attempt = await this.attempts.getAttempt(requestId);
      if (attempt?.status === "proposed" && attempt.peerUserId) {
        const pending = await this.proposals.readPending(userId, attempt.peerUserId);
        if (pending) {
          const reasonLow = userId === pending.userLow ? "cancelled_by_user" : "proposal_peer_cancelled";
          const reasonHigh = userId === pending.userHigh ? "cancelled_by_user" : "proposal_peer_cancelled";
          await this.teardownProposal({
            pending,
            skipByUserId: null,
            reasonForUserLow: reasonLow,
            reasonForUserHigh: reasonHigh,
          });
          void this.webhook.notifyMatchProposalCancelled({
            userId: pending.userLow,
            attemptId: pending.attemptLow,
            reason: reasonLow,
          });
          void this.webhook.notifyMatchProposalCancelled({
            userId: pending.userHigh,
            attemptId: pending.attemptHigh,
            reason: reasonHigh,
          });
          logger.info("[cancelMatch] aborted active proposal", { userId });
          return;
        }
      }
      await this.attempts.markNoMatch(requestId, userId, "cancelled_by_user");
    }
    logger.info("[cancelMatch] done", { userId });
  }
}
