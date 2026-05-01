import { API_ENDPOINTS, baseApi } from "@/lib/api";
import { API_BASE_URL } from "@/shared/constants/environments";
import { invalidateRoomAndPeersCallStatusTags, roomEntityTag } from "@/features/room/lib/room-rtk-cache";

import { parseRoomData, type RoomData } from "@/features/matching/types/room.types";
import type {
  RoomInviteMutationArg,
  RoomInviteMutationResult,
  RoomInviteRespondMutationArg,
  RoomInviteRespondMutationResult,
  UpdateRoomTitleMutationArg,
  UpdateRoomTitleMutationResult,
  RoomApiEnvelope,
} from "../types/room-api.types";

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

function toRoomData(response: RoomGetApiResponse): RoomData {
  if (!response.success || response.data == null) {
    throw new Error(response.message ?? "Room not found");
  }
  return parseRoomData(response.data);
}

function toExpandInviteResult(
  response: RoomApiEnvelope<{ inviteId: string }>,
): RoomInviteMutationResult {
  if (!response.success || !response.data?.inviteId) {
    throw new Error(response.message ?? "Could not send invite");
  }
  return { inviteId: response.data.inviteId };
}

function toExpandRespondResult(
  response: RoomApiEnvelope<{ roomId: string; expanded: boolean }>,
): RoomInviteRespondMutationResult {
  if (!response.success || response.data == null) {
    throw new Error(response.message ?? "Could not respond");
  }
  return response.data;
}

function toUpdateRoomTitleResult(
  response: RoomApiEnvelope<{ title: string }>,
): UpdateRoomTitleMutationResult {
  if (!response.success || response.data?.title == null) {
    throw new Error(response.message ?? "Could not update title");
  }
  return { title: response.data.title };
}

function assertJoinRoomOk(response: JoinRoomApiResponse): void {
  if (!response.success) {
    throw new Error(response.message ?? "Could not join room");
  }
}

export const roomApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    leaveRoom: build.mutation<void, void>({
      query: () => ({
        url: MATCHING.LEAVE_ROOM,
        method: "POST",
      }),
    }),

    /**
     * GET `/room/:roomId` — Redis match pair or DB room metadata.
     */
    getRoom: build.query<RoomData, string>({
      query: (roomId) => ({ url: ROOM.get(roomId) }),
      providesTags: (_result, _error, roomId) => [roomEntityTag(roomId)],
      transformResponse: toRoomData,
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
      transformResponse: assertJoinRoomOk,
    }),

    roomInvite: build.mutation<
      RoomInviteMutationResult,
      RoomInviteMutationArg
    >({
      query: ({ roomId, inviteeUserId }) => ({
        url: ROOM.invite(roomId),
        method: "POST",
        body: { inviteeUserId },
      }),
      transformResponse: toExpandInviteResult,
      invalidatesTags: (_result, _error, arg) => [...invalidateRoomAndPeersCallStatusTags(arg.roomId)],
    }),

    roomInviteRespond: build.mutation<
      RoomInviteRespondMutationResult,
      RoomInviteRespondMutationArg
    >({
      query: ({ roomId, inviteId, accept }) => ({
        url: ROOM.inviteRespond(roomId),
        method: "POST",
        body: { inviteId, accept },
      }),
      transformResponse: toExpandRespondResult,
      invalidatesTags: (_result, _error, arg) => [...invalidateRoomAndPeersCallStatusTags(arg.roomId)],
    }),

    updateRoomTitle: build.mutation<UpdateRoomTitleMutationResult, UpdateRoomTitleMutationArg>({
      query: ({ roomId, title }) => ({
        url: ROOM.updateTitle(roomId),
        method: "PATCH",
        body: { title },
      }),
      transformResponse: toUpdateRoomTitleResult,
      invalidatesTags: (_result, _error, arg) => [roomEntityTag(arg.roomId)],
    }),
  }),
});

export const {
  useLeaveRoomMutation,
  useGetRoomQuery,
  useJoinRoomMutation,
  useRoomInviteMutation,
  useRoomInviteRespondMutation,
  useUpdateRoomTitleMutation,
} = roomApi;

/** Back-compat aliases (legacy direct-expand naming). */
export const useExpandDirectInviteMutation = useRoomInviteMutation;
export const useExpandDirectRespondMutation = useRoomInviteRespondMutation;
