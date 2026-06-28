'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';

import { API_ENDPOINTS } from '@/lib/api';
import { API_BASE_URL } from '@/shared/constants/environments';
import { setRtcTokenInCache } from '@/features/rtc/lib/rtc-token-cache';

import { invalidateSpacesCaches } from '@/features/spaces/lib/invalidate-spaces-cache';
import {
  invalidateRoomAfterOpenMeeting,
  invalidateRoomAfterRtcSessionChange,
  invalidateRoomAndPeersCallStatus,
  invalidateRoomDetail,
} from '../lib/invalidate-room-cache';
import { roomApiFetch, roomApiVoid } from '../lib/room-api-fetch';
import type {
  JoinRoomResponse,
  RoomInviteMutationArg,
  RoomInviteMutationResult,
  RoomInviteRespondMutationArg,
  RoomInviteRespondMutationResult,
  UpdateRoomTitleMutationArg,
  UpdateRoomTitleMutationResult,
} from '../types/api/room-api.types';
import {
  serializeKickSpaceParticipantBody,
  type KickSpaceParticipantRequest,
} from '@/features/room/types/call/participant-remove.types';

const { MATCHING, ROOM } = API_ENDPOINTS;

/** Fire-and-forget for tab close / refresh; session cookie identifies the user. */
export function leaveRoomKeepalive(): void {
  if (typeof window === 'undefined') return;
  void fetch(`${API_BASE_URL}${MATCHING.LEAVE_ROOM}`, {
    method: 'POST',
    credentials: 'include',
    keepalive: true,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({}),
  });
}

/** Clears lobby / RTC participation when navigating away from a space page. */
export function leaveSpaceRtcKeepalive(roomId: string): void {
  if (typeof window === 'undefined' || !roomId) return;
  void fetch(`${API_BASE_URL}${ROOM.leaveSpaceRtc(roomId)}`, {
    method: 'POST',
    credentials: 'include',
    keepalive: true,
  });
}

export function useLeaveRoom() {
  return useMutation({
    mutationFn: (arg?: { roomId?: string } | void) =>
      roomApiVoid(MATCHING.LEAVE_ROOM, {
        method: 'POST',
        body:
          arg && typeof arg === 'object' && typeof arg.roomId === 'string' && arg.roomId.length > 0
            ? JSON.stringify({ roomId: arg.roomId })
            : undefined,
      }),
  });
}

/**
 * POST `/room/:roomId/join` — for live rooms the response includes the RTC JWT (no separate rtc-token fetch).
 */
export function useJoinRoom() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (roomId: string) =>
      roomApiFetch<JoinRoomResponse>(
        ROOM.join(roomId),
        { method: 'POST' },
        'Could not join room',
      ),
    onSuccess: (data, roomId) => {
      if (data.rtc?.token) {
        setRtcTokenInCache(roomId, data.rtc, qc);
      }
    },
  });
}

export function useStartScheduledSpace() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (roomId: string) =>
      roomApiVoid(ROOM.start(roomId), { method: 'POST' }, 'Could not join room'),
    onSuccess: (_result, roomId) => {
      invalidateRoomAfterRtcSessionChange(qc, roomId);
    },
  });
}

export function useOpenSpaceMeeting() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (roomId: string) =>
      roomApiVoid(ROOM.openMeeting(roomId), { method: 'POST' }, 'Could not open space'),
    onSuccess: (_result, roomId) => {
      invalidateRoomAfterOpenMeeting(qc, roomId);
    },
  });
}

export function useLeaveSpaceRtc() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (roomId: string) =>
      roomApiVoid(ROOM.leaveSpaceRtc(roomId), { method: 'POST' }, 'Could not leave space RTC'),
    onSuccess: (_result, roomId) => {
      invalidateRoomAfterRtcSessionChange(qc, roomId);
    },
  });
}

export function useHostEndSpaceForEveryone() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (roomId: string) =>
      roomApiVoid(
        ROOM.hostEndSpaceForEveryone(roomId),
        { method: 'POST' },
        'Could not end space',
      ),
    onSuccess: (_result, roomId) => {
      invalidateRoomAfterRtcSessionChange(qc, roomId);
    },
  });
}

export function useKickSpaceParticipant() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: ({ roomId, userId, restrict }: KickSpaceParticipantRequest) =>
      roomApiVoid(
        ROOM.kickParticipant(roomId, userId),
        {
          method: 'POST',
          body: serializeKickSpaceParticipantBody(restrict),
        },
        'Could not remove participant',
      ),
    onSuccess: (_result, { roomId }) => {
      // Host stays in the same RTC session — do not refetch the token (new JWT reconnects
      // rtc-service and tears down mediasoup, turning off mic/camera).
      invalidateRoomAndPeersCallStatus(qc, roomId);
      invalidateSpacesCaches(qc);
    },
  });
}

export function useReportSpaceNsfwViolation() {
  return useMutation({
    mutationFn: async ({
      roomId,
      clientScores,
    }: {
      roomId: string;
      clientScores?: { className: string; probability: number }[];
    }) => {
      const data = await roomApiFetch<
        { removed: boolean; strikeCount: number; accountBanned: boolean } | undefined
      >(
        ROOM.nsfwViolation(roomId),
        {
          method: 'POST',
          body: clientScores?.length ? JSON.stringify({ clientScores }) : undefined,
        },
        'Could not report violation',
      );
      return data ?? { removed: true, strikeCount: 1, accountBanned: false };
    },
  });
}

export function useRoomInvite() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: ({ roomId, inviteeUserId }: RoomInviteMutationArg) =>
      roomApiFetch<{ inviteId: string }>(
        ROOM.invite(roomId),
        {
          method: 'POST',
          body: JSON.stringify({ inviteeUserId }),
        },
        'Could not send invite',
      ).then((data) => ({ inviteId: data.inviteId }) as RoomInviteMutationResult),
    onSuccess: (_result, arg) => {
      invalidateRoomAndPeersCallStatus(qc, arg.roomId);
    },
  });
}

export function useRoomInviteRespond() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: ({ roomId, inviteId, accept }: RoomInviteRespondMutationArg) =>
      roomApiFetch<{ roomId: string; expanded: boolean }>(
        ROOM.inviteRespond(roomId),
        {
          method: 'POST',
          body: JSON.stringify({ inviteId, accept }),
        },
        'Could not respond',
      ).then((data) => data as RoomInviteRespondMutationResult),
    onSuccess: (_result, arg) => {
      invalidateRoomAndPeersCallStatus(qc, arg.roomId);
    },
  });
}

export function useUpdateRoomTitle() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: ({ roomId, title }: UpdateRoomTitleMutationArg) =>
      roomApiFetch<{ title: string }>(
        ROOM.updateTitle(roomId),
        {
          method: 'PATCH',
          body: JSON.stringify({ title }),
        },
        'Could not update title',
      ).then((data) => ({ title: data.title }) as UpdateRoomTitleMutationResult),
    onSuccess: (_result, arg) => {
      invalidateRoomDetail(qc, arg.roomId);
    },
  });
}
