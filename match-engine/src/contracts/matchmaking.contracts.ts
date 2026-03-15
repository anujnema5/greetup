export type FindMatchRequest = {
  userId: string;
  requestId: string;
};

export type FindMatchResult =
  | { status: "matched"; roomId: string; peerUserId: string; matchScore: number }
  | { status: "searching"; retryAfterMs: number }
  | { status: "no_match"; reason: string };

export type SnapshotUserProfile = {
  userId: string;
  matchIds: string[];
  filters: Record<string, unknown>;
  attributes: Record<string, unknown>;
  version: number;
  updatedAt: number;
};
