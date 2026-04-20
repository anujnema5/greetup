/**
 * Matching-only RTK Query endpoints (search / cancel / respond / peer preview).
 */

import { API_ENDPOINTS, baseApi } from "@/lib/api";

import type {
  FindMatchResponse,
  MatchPeerPreview,
} from "../types/matching-api.types";

const { MATCHING } = API_ENDPOINTS;

// ── Generic server envelopes (room + matching share this shape) ─────────────

type RoomGetApiResponse = {
  success: boolean;
  data?: unknown;
  message?: string;
};

// ── Response transforms ───────────────────────────────────────────────────────

function toMatchPeerPreview(response: RoomGetApiResponse): MatchPeerPreview {
  if (!response.success || response.data == null) {
    throw new Error(response.message ?? "Could not load peer");
  }
  return response.data as MatchPeerPreview;
}

// ── API slice ─────────────────────────────────────────────────────────────────

export const matchingApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    // --- Matchmaking (search / cancel / respond) ------------------------------

    findMatch: build.mutation<FindMatchResponse, void>({
      query: () => ({
        url: MATCHING.FIND,
        method: "POST",
      }),
    }),

    cancelMatch: build.mutation<void, void>({
      query: () => ({
        url: MATCHING.CANCEL,
        method: "POST",
      }),
    }),

    respondMatchProposal: build.mutation<
      void,
      { attemptId: string; decision: "connect" | "skip" }
    >({
      query: (body) => ({
        url: MATCHING.RESPOND,
        method: "POST",
        body,
      }),
    }),

    // --- Peer preview ---------------------------------------------------------

    getMatchPeerPreview: build.query<MatchPeerPreview, string>({
      query: (peerUserId) => ({ url: MATCHING.peerPreview(peerUserId) }),
      transformResponse: toMatchPeerPreview,
    }),

  }),
});

export const {
  useFindMatchMutation,
  useCancelMatchMutation,
  useRespondMatchProposalMutation,
  useGetMatchPeerPreviewQuery,
} = matchingApi;
