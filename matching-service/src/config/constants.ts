import { env } from "@/config/env";

export const APP_CONFIG = {
  serviceName: "matching-service",
  host: env.host,
  port: env.port,
} as const;

export const MATCH_CONFIG = {
  searchTimeoutMs: 25_000,
  lockTtlMs: 20_000,
  roomCreateTimeoutMs: 7_000,
  maxRetries: 3,
  retryBackoffMs: [500, 1_500, 3_500],
  candidateBatchSize: 25,
  /** Failsafe TTL so users are not stuck in `in_room` if leave-room is never called. */
  userInRoomStateTtlSeconds: 7200,
  attemptTtlSeconds: 120,
} as const;

export const MATCH_SCORE_CONFIG = {
  // Higher weights represent stronger matching intent.
  weights: {
    interests: 40,
    goals: 20,
    professions: 10,
    agePreference: 10,
    distancePreference: 10,
    preferredGender: 5,
    trustScore: 5,
  },
  minScoreToMatch: 35,
} as const;
