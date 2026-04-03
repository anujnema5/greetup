/**
 * Matching API — RTK Query / fetch shapes (align with server match routes where applicable).
 */
export interface FindMatchResponse {
  success: boolean;
  data: {
    requestId: string;
    status: "searching" | "matched" | "no_match";
    /** Set when status is `no_match` (e.g. `user_unavailable`, `snapshot_not_found`). */
    reason?: string;
  };
  message: string;
}
