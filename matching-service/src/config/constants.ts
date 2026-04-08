import { env } from "@/config/env";

export const APP_CONFIG = {
  serviceName: "matching-service",
  host: env.host,
  port: env.port,
} as const;

export const MATCH_CONFIG = {
  searchTimeoutMs: 25_000,
  lockTtlMs: 20_000,
  /** Locks while both users see "Match found" and tap Connect or Skip */
  proposalPhaseLockTtlMs: 180_000,
  roomCreateTimeoutMs: 7_000,
  maxRetries: 3,
  retryBackoffMs: [500, 1_500, 3_500],
  candidateBatchSize: 25,
  /** Failsafe TTL so users are not stuck in `in_room` if leave-room is never called. */
  userInRoomStateTtlSeconds: 7200,
  /** Covers search + proposal UI + room join */
  attemptTtlSeconds: 600,
  /** TTL for skip list keys (`mm:user:skip-peers:{userId}`) */
  skipPeerListTtlSeconds: 604_800,
  /** NX lock TTL when racing to create the room after mutual connect */
  connectFinalizeLockTtlSeconds: 45,
} as const;

export const MATCH_SCORE_CONFIG = {
  // Higher weights represent stronger matching intent.
  // Match prep (moods / looking for / who to prioritize) is weighted highest so 1:1 intent dominates interests.
  weights: {
    interests: 12,
    goals: 13,
    professions: 6,
    agePreference: 6,
    distancePreference: 6,
    preferredGender: 3,
    trustScore: 2,
    sessionMoods: 28,
    sessionLookingFor: 28,
    connectionPreference: 21,
  },
  minScoreToMatch: 35,
} as const;
