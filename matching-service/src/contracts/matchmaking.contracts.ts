export type FindMatchRequest = {
  userId: string;
  requestId: string;
};

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
