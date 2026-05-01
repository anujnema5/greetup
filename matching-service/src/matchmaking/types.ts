export type FindMatchRequest = {
  userId: string;
  requestId: string;
};

/**
 * Subscription level used to route matching behavior.
 * Premium tiers can receive stronger matching retries.
 */
export type MatchUserTier = "standard" | "premium";

/** Candidate algorithm family chosen for this match request. */
export type MatchAlgorithm = "standard_pool" | "premium_pool";

export type FindMatchResult =
  | { status: "matched"; roomId: string; peerUserId: string; matchScore: number }
  | {
      status: "proposed";
      /** Same as `mm:attempt` id — use for `/match/respond` */
      requestId: string;
      peerUserId: string;
      matchScore: number;
      isFallbackMatch: boolean;
    }
  | { status: "searching"; retryAfterMs: number; requestId?: string }
  | { status: "no_match"; reason: string };

/**
 * Parsed `user:profile:snapshot:{userId}` JSON. Populated by the snapshot repository from Redis;
 * match-prep fields live on `attributes` (e.g. `sessionMoodIds`, `sessionLookingForIds`, `connectionPreference`).
 */
export type SnapshotUserProfile = {
  userId: string;
  matchIds: string[];
  filters: Record<string, unknown>;
  attributes: Record<string, unknown>;
  version: number;
  updatedAt: number;
};

export type MatchState = "free" | "searching" | "locked" | "matched" | "in_room";

export type MatchCandidate = {
  userId: string;
  score: number;
};

/** Pool candidate after compatibility and scoring (ready to rank and pair). */
export type ScoredMatchCandidate = {
  userId: string;
  matchScore: number;
  poolScore: number;
};

export type MatchAttempt = {
  attemptId: string;
  requesterId: string;
  retryCount: number;
};
