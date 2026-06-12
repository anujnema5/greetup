import type { QueryClient } from '@tanstack/react-query';

import { queryClient } from '@/lib/query/client';
import { queryKeys } from '@/lib/query/keys';
import type { RoomSessionType } from '@/shared/types/room-session';

import type { RtcTokenPayload } from '../types/rtc-api.types';

/** Cache TTL aligned with JWT lifetime — refetch only after invalidate or expiry. */
const RTC_TOKEN_STALE_MS = 14 * 60 * 1000;

export function getRtcTokenStaleTimeMs(): number {
  return RTC_TOKEN_STALE_MS;
}

export function setRtcTokenInCache(
  roomId: string,
  payload: RtcTokenPayload,
  qc: QueryClient = queryClient,
): void {
  qc.setQueryData(queryKeys.rtc.token(roomId), payload);
}

export function invalidateRtcTokenCache(roomId: string, qc: QueryClient = queryClient) {
  void qc.invalidateQueries({ queryKey: queryKeys.rtc.token(roomId) });
}

export function patchRtcTokenRoomTypeInCache(
  roomId: string,
  roomType: RoomSessionType,
  qc: QueryClient = queryClient,
) {
  qc.setQueryData<RtcTokenPayload>(queryKeys.rtc.token(roomId), (draft) => {
    if (!draft) return draft;
    return { ...draft, roomType };
  });
}
