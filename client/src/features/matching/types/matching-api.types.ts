/**
 * Matching API — RTK Query / fetch shapes (align with server match routes where applicable).
 */

import type { PublicProfileConnectionState } from "@/features/user-profile/types/public-profile.types";

/** GET `/matching/peer-preview/:peerUserId` — “Match found” card fields */
export interface MatchPeerPreview {
  displayName: string;
  /** Primary profession from profile snapshot. */
  profession: string | null;
  headline: string | null;
  initials: string;
  interestTags: string[];
  moreInterestsCount: number;
  isOnline: boolean;
  insight: string | null;
  image: string | null;
  username: string | null;
  connectionState: PublicProfileConnectionState;
  connectionId: string | null;
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
