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

export type SnapshotUserProfile = {
  userId: string;
  matchIds: string[];
  filters: Record<string, unknown>;
  attributes: Record<string, unknown>;
  version: number;
  updatedAt: number;
};
