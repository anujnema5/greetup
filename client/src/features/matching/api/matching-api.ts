import { API_ENDPOINTS, baseApi } from "@/lib/api";
import { invalidateRoomAndPeersCallStatusTags, roomEntityTag } from "@/lib/api/rtk-cache-tags";
import { API_BASE_URL } from "@/shared/constants/environments";

import type {
  ExpandDirectInviteMutationArg,
  ExpandDirectInviteMutationResult,
  ExpandDirectRespondMutationArg,
  ExpandDirectRespondMutationResult,
  FindMatchResponse,
  MatchPeerPreview,
  MatchingApiEnvelope,
} from "../types/matching-api.types";
import { parseRoomData, type RoomData } from "../types/room.types";

const { MATCHING, ROOM } = API_ENDPOINTS;

type RoomGetApiResponse = {
  success: boolean;
  data?: unknown;
  message?: string;
};

type JoinRoomApiResponse = {
  success: boolean;
  data?: unknown;
  message?: string;
};

/** Fire-and-forget for tab close / refresh; session cookie identifies the user. */
export function leaveRoomKeepalive(): void {
  if (typeof window === "undefined") return;
  void fetch(`${API_BASE_URL}${MATCHING.LEAVE_ROOM}`, {
    method: "POST",
    credentials: "include",
    keepalive: true,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({}),
  });
}

export const matchingApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
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
    respondMatchProposal: build.mutation<void, { attemptId: string; decision: "connect" | "skip" }>({
      query: (body) => ({
        url: MATCHING.RESPOND,
        method: "POST",
        body,
      }),
    }),
    leaveRoom: build.mutation<void, void>({
      query: () => ({
        url: MATCHING.LEAVE_ROOM,
        method: "POST",
      }),
    }),
    getMatchPeerPreview: build.query<MatchPeerPreview, string>({
      query: (peerUserId) => ({ url: MATCHING.peerPreview(peerUserId) }),
      transformResponse: (response: RoomGetApiResponse): MatchPeerPreview => {
        if (!response.success || response.data == null) {
          throw new Error(response.message ?? "Could not load peer");
        }
        return response.data as MatchPeerPreview;
      },
    }),
    /** GET `/room/:roomId` — Redis match pair or DB room metadata. */
    getRoom: build.query<RoomData, string>({
      query: (roomId) => ({ url: ROOM.get(roomId) }),
      providesTags: (_result, _error, roomId) => [roomEntityTag(roomId)],
      transformResponse: (response: RoomGetApiResponse): RoomData => {
        if (!response.success || response.data == null) {
          throw new Error(response.message ?? "Room not found");
        }
        return parseRoomData(response.data);
      },
    }),
    expandDirectInvite: build.mutation<
      ExpandDirectInviteMutationResult,
      ExpandDirectInviteMutationArg
    >({
      query: ({ roomId, inviteeUserId }) => ({
        url: ROOM.expandDirectInvite(roomId),
        method: "POST",
        body: { inviteeUserId },
      }),
      transformResponse: (
        response: MatchingApiEnvelope<{ inviteId: string }>,
      ): ExpandDirectInviteMutationResult => {
        if (!response.success || !response.data?.inviteId) {
          throw new Error(response.message ?? "Could not send invite");
        }
        return { inviteId: response.data.inviteId };
      },
      invalidatesTags: (_r, _e, arg) => [...invalidateRoomAndPeersCallStatusTags(arg.roomId)],
    }),
    expandDirectRespond: build.mutation<
      ExpandDirectRespondMutationResult,
      ExpandDirectRespondMutationArg
    >({
      query: ({ roomId, inviteId, accept }) => ({
        url: ROOM.expandDirectRespond(roomId),
        method: "POST",
        body: { inviteId, accept },
      }),
      transformResponse: (
        response: MatchingApiEnvelope<{ roomId: string; expanded: boolean }>,
      ): ExpandDirectRespondMutationResult => {
        if (!response.success || response.data == null) {
          throw new Error(response.message ?? "Could not respond");
        }
        return response.data;
      },
      invalidatesTags: (_r, _e, arg) => [...invalidateRoomAndPeersCallStatusTags(arg.roomId)],
    }),
    /**
     * POST `/room/:roomId/join` — ensure `room_participants` row so RTC token can be issued
     * (direct match + circles).
     *
     * Does **not** invalidate `RtcToken`: that would refetch JWT for every subscriber of this room
     * (including people already in the call), recreating the rtc Socket.IO client and tearing down
     * mediasoup producers — `producer_not_found` and black video for everyone.
     */
    joinRoom: build.mutation<void, string>({
      query: (roomId) => ({
        url: ROOM.join(roomId),
        method: "POST",
      }),
      transformResponse: (response: JoinRoomApiResponse): void => {
        if (!response.success) {
          throw new Error(response.message ?? "Could not join room");
        }
      },
    }),
  }),
});

export const {
  useFindMatchMutation,
  useCancelMatchMutation,
  useRespondMatchProposalMutation,
  useLeaveRoomMutation,
  useGetMatchPeerPreviewQuery,
  useGetRoomQuery,
  useJoinRoomMutation,
  useExpandDirectInviteMutation,
  useExpandDirectRespondMutation,
} = matchingApi;
