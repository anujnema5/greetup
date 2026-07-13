'use client';

import { useMutation } from '@tanstack/react-query';

import { API_ENDPOINTS } from '@/lib/api';
import { API_BASE_URL } from '@/shared/constants/environments';
import { ApiError } from '@/lib/api/fetch-client';

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
} from '../types/activity-api.types';

const { ROOM } = API_ENDPOINTS;

async function activityApiFetch<T>(
  path: string,
  init?: RequestInit,
  fallbackMessage = 'Request failed',
): Promise<T> {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    credentials: 'include',
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...init?.headers,
    },
  });
  if (!res.ok) throw new ApiError(res.status, await res.text());
  const json = (await res.json()) as ActivityApiEnvelope<T>;
  if (!json.success || json.data == null) {
    throw new Error(json.message ?? fallbackMessage);
  }
  return json.data;
}

export function useRoomChessInvite() {
  return useMutation({
    mutationFn: ({ roomId }: RoomChessInviteMutationArg) =>
      activityApiFetch<RoomChessInviteMutationResult>(
        ROOM.chessInvite(roomId),
        { method: 'POST', body: JSON.stringify({}) },
        'Could not send chess invite',
      ),
  });
}

export function useRoomChessRespond() {
  return useMutation({
    mutationFn: ({ roomId, requestId, accept }: RoomChessRespondMutationArg) =>
      activityApiFetch<RoomChessRespondMutationResult>(
        ROOM.chessRespond(roomId),
        {
          method: 'POST',
          body: JSON.stringify({ requestId, accept }),
        },
        'Could not respond to chess invite',
      ),
  });
}

export function useRoomChessEnd() {
  return useMutation({
    mutationFn: ({ roomId, gameId }: RoomChessEndMutationArg) =>
      activityApiFetch<RoomChessEndMutationResult>(
        ROOM.chessEnd(roomId),
        {
          method: 'POST',
          body: JSON.stringify({ gameId }),
        },
        'Could not end chess game',
      ),
  });
}

export function useRoomChessMove() {
  return useMutation({
    mutationFn: ({ roomId, ...body }: RoomChessMoveMutationArg) =>
      activityApiFetch<RoomChessMoveMutationResult>(
        ROOM.chessMove(roomId),
        {
          method: 'POST',
          body: JSON.stringify(body),
        },
        'Could not apply chess move',
      ),
  });
}

export function useRoomChessDrawOffer() {
  return useMutation({
    mutationFn: ({ roomId, gameId }: RoomChessDrawOfferMutationArg) =>
      activityApiFetch<RoomChessDrawOfferMutationResult>(
        ROOM.chessDrawOffer(roomId),
        {
          method: 'POST',
          body: JSON.stringify({ gameId }),
        },
        'Could not offer draw',
      ),
  });
}

export function useRoomChessDrawRespond() {
  return useMutation({
    mutationFn: ({ roomId, gameId, accept }: RoomChessDrawRespondMutationArg) =>
      activityApiFetch<RoomChessDrawRespondMutationResult>(
        ROOM.chessDrawRespond(roomId),
        {
          method: 'POST',
          body: JSON.stringify({ gameId, accept }),
        },
        'Could not respond to draw offer',
      ),
  });
}
