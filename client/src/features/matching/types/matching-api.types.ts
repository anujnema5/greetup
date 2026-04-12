/**
 * Matching API — RTK Query / fetch shapes (align with server match routes where applicable).
 */

/** Common JSON envelope for several match/room POST responses. */
export type MatchingApiEnvelope<T> = {
  success: boolean;
  data?: T;
  message?: string;
};

export type ExpandDirectInviteMutationArg = { roomId: string; inviteeUserId: string };
export type ExpandDirectInviteMutationResult = { inviteId: string };

export type ExpandDirectRespondMutationArg = {
  roomId: string;
  inviteId: string;
  accept: boolean;
};
export type ExpandDirectRespondMutationResult = { roomId: string; expanded: boolean };

/** GET `/matching/peer-preview/:peerUserId` — “Match found” card fields */
export interface MatchPeerPreview {
  displayName: string;
  headline: string | null;
  initials: string;
  interestTags: string[];
  moreInterestsCount: number;
  isOnline: boolean;
  insight: string | null;
  image: string | null;
}

export interface FindMatchResponse {
  success: boolean;
  data: {
    requestId: string;
    status: "searching" | "proposed" | "matched" | "no_match";
    peerUserId?: string;
    matchScore?: number;
    isFallbackMatch?: boolean;
    /** Set when status is `no_match` (e.g. `user_unavailable`, `snapshot_not_found`). */
    reason?: string;
  };
  message: string;
}
