import { API_ENDPOINTS, baseApi } from "@/lib/api";

import type {
  ActivityApiEnvelope,
  RoomChessDrawOfferMutationArg,
  RoomChessDrawOfferMutationResult,
  RoomChessDrawRespondMutationArg,
  RoomChessDrawRespondMutationResult,
  RoomChessEndMutationArg,
  RoomChessEndMutationResult,
  RoomChessInviteMutationArg,
  RoomChessInviteMutationResult,
  RoomChessMoveMutationArg,
  RoomChessMoveMutationResult,
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

function toChessMoveResult(
  response: ActivityApiEnvelope<{
    roomId: string;
    gameId: string;
    moved: boolean;
    moveNumber: number;
    fen: string;
    turn: "w" | "b";
    isGameOver: boolean;
  }>,
): RoomChessMoveMutationResult {
  return toActivityResult(response, "Could not apply chess move");
}

function toChessDrawOfferResult(
  response: ActivityApiEnvelope<{ roomId: string; gameId: string; offered: boolean }>,
): RoomChessDrawOfferMutationResult {
  return toActivityResult(response, "Could not offer draw");
}

function toChessDrawRespondResult(
  response: ActivityApiEnvelope<{ roomId: string; gameId: string; accepted: boolean }>,
): RoomChessDrawRespondMutationResult {
  return toActivityResult(response, "Could not respond to draw offer");
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

    roomChessMove: build.mutation<RoomChessMoveMutationResult, RoomChessMoveMutationArg>({
      query: ({ roomId, ...body }) => ({
        url: ROOM.chessMove(roomId),
        method: "POST",
        body,
      }),
      transformResponse: toChessMoveResult,
    }),

    roomChessDrawOffer: build.mutation<RoomChessDrawOfferMutationResult, RoomChessDrawOfferMutationArg>({
      query: ({ roomId, gameId }) => ({
        url: ROOM.chessDrawOffer(roomId),
        method: "POST",
        body: { gameId },
      }),
      transformResponse: toChessDrawOfferResult,
    }),

    roomChessDrawRespond: build.mutation<
      RoomChessDrawRespondMutationResult,
      RoomChessDrawRespondMutationArg
    >({
      query: ({ roomId, gameId, accept }) => ({
        url: ROOM.chessDrawRespond(roomId),
        method: "POST",
        body: { gameId, accept },
      }),
      transformResponse: toChessDrawRespondResult,
    }),
  }),
});

export const {
  useRoomChessInviteMutation,
  useRoomChessMoveMutation,
  useRoomChessDrawOfferMutation,
  useRoomChessDrawRespondMutation,
  useRoomChessRespondMutation,
  useRoomChessEndMutation,
} = activityApi;
