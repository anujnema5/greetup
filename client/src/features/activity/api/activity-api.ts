import { API_ENDPOINTS, baseApi } from "@/lib/api";

import type {
  ActivityApiEnvelope,
  RoomChessEndMutationArg,
  RoomChessEndMutationResult,
  RoomChessInviteMutationArg,
  RoomChessInviteMutationResult,
  RoomChessRespondMutationArg,
  RoomChessRespondMutationResult,
} from "../types/activity-api.types";

const { ROOM } = API_ENDPOINTS;

function toActivityResult<T>(response: ActivityApiEnvelope<T>, fallbackMessage: string): T {
  if (!response.success || response.data == null) {
    throw new Error(response.message ?? fallbackMessage);
  }
  return response.data;
}

function toChessInviteResult(
  response: ActivityApiEnvelope<{ requestId: string; inviteeUserId: string }>,
): RoomChessInviteMutationResult {
  return toActivityResult(response, "Could not send chess invite");
}

function toChessRespondResult(
  response: ActivityApiEnvelope<{ roomId: string; started: boolean; gameId: string | null }>,
): RoomChessRespondMutationResult {
  return toActivityResult(response, "Could not respond to chess invite");
}

function toChessEndResult(
  response: ActivityApiEnvelope<{ roomId: string; ended: boolean }>,
): RoomChessEndMutationResult {
  return toActivityResult(response, "Could not end chess game");
}

export const activityApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    roomChessInvite: build.mutation<RoomChessInviteMutationResult, RoomChessInviteMutationArg>({
      query: ({ roomId }) => ({
        url: ROOM.chessInvite(roomId),
        method: "POST",
        body: {},
      }),
      transformResponse: toChessInviteResult,
    }),

    roomChessRespond: build.mutation<RoomChessRespondMutationResult, RoomChessRespondMutationArg>({
      query: ({ roomId, requestId, accept }) => ({
        url: ROOM.chessRespond(roomId),
        method: "POST",
        body: { requestId, accept },
      }),
      transformResponse: toChessRespondResult,
    }),

    roomChessEnd: build.mutation<RoomChessEndMutationResult, RoomChessEndMutationArg>({
      query: ({ roomId, gameId }) => ({
        url: ROOM.chessEnd(roomId),
        method: "POST",
        body: { gameId },
      }),
      transformResponse: toChessEndResult,
    }),
  }),
});

export const {
  useRoomChessInviteMutation,
  useRoomChessRespondMutation,
  useRoomChessEndMutation,
} = activityApi;
