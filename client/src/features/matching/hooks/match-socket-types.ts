/** Payloads emitted by the server for Socket.IO `match:*` events. */

export type MatchCompletedPayload = {
  roomId: string;
  attemptId: string;
  matchScore: number;
  isFallbackMatch: boolean;
  peerId: string;
};

export type MatchProposedPayload = {
  attemptId: string;
  peerId: string;
  matchScore: number;
  isFallbackMatch: boolean;
};

export type MatchStatePayload = {
  status: 'searching' | 'proposed' | 'matched' | 'idle';
  requestId?: string;
  roomId?: string;
  peerUserId?: string;
  matchScore?: number;
  isFallbackMatch?: boolean;
};

export type MatchNoMatchPayload = { attemptId: string; reason: string };

export type MatchProposalCancelledPayload = { attemptId: string; reason: string };
