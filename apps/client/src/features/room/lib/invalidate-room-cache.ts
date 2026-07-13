import type { QueryClient } from '@tanstack/react-query';

import { invalidateSpacesCaches } from '@/features/spaces/lib/invalidate-spaces-cache';
import { invalidateRtcTokenCache } from '@/features/rtc/lib/rtc-token-cache';
import { queryClient } from '@/lib/query/client';
import { queryKeys } from '@/lib/query/keys';

export function invalidateRoomDetail(
  qc: QueryClient = queryClient,
  roomId?: string,
) {
  if (roomId) {
    void qc.invalidateQueries({ queryKey: queryKeys.room.detail(roomId) });
    return;
  }
  void qc.invalidateQueries({ queryKey: queryKeys.room.all });
}

export function invalidateRoomAndPeersCallStatus(
  qc: QueryClient = queryClient,
  roomId: string,
) {
  invalidateRoomDetail(qc, roomId);
  void qc.invalidateQueries({ queryKey: queryKeys.connections.all });
}

export function invalidateRoomAfterRtcSessionChange(
  qc: QueryClient = queryClient,
  roomId: string,
) {
  invalidateRtcTokenCache(roomId, qc);
  invalidateRoomDetail(qc, roomId);
  invalidateSpacesCaches(qc);
  invalidateRoomAndPeersCallStatus(qc, roomId);
}

export function invalidateRoomAfterOpenMeeting(
  qc: QueryClient = queryClient,
  roomId: string,
) {
  invalidateRtcTokenCache(roomId, qc);
  invalidateRoomDetail(qc, roomId);
}
