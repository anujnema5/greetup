export type MatchCompletedPayload = {
  attemptId: string;
  userA: string;
  userB: string;
  roomId: string;
  matchScore: number;
  isFallbackMatch: boolean;
};

export type MatchFailedPayload = {
  attemptId: string;
  userId: string;
  reason: string;
};

export type MatchProposedPayload = {
  userA: string;
  userB: string;
  attemptIdA: string;
  attemptIdB: string;
  matchScore: number;
  isFallbackMatch: boolean;
};

export type MatchProposalCancelledPayload = {
  userId: string;
  attemptId: string;
  reason: string;
};

export type EnsureSnapshotApiSuccessBody = {
  success?: boolean;
  data?: { cached?: boolean };
};

export type WebhookPostResult =
  | { ok: true; status: number; json?: unknown }
  | { ok: false; status?: number; body?: string; error?: unknown };
