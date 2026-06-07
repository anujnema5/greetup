import type { QueryClient } from '@tanstack/react-query';

import type { RoomData } from '@/features/matching/types/room.types';
import { queryKeys } from '@/lib/query/keys';

import { patchCachedRoomOpenedForJoin } from './session/room-cache-patches';

export function patchRoomInCache(
  qc: QueryClient,
  roomId: string,
  updater: (draft: RoomData) => void,
) {
  qc.setQueryData<RoomData>(queryKeys.room.detail(roomId), (draft) => {
    if (!draft) return draft;
    updater(draft);
    return { ...draft } as RoomData;
  });
}

export function patchRoomOpenedForJoinInCache(qc: QueryClient, roomId: string) {
  patchRoomInCache(qc, roomId, patchCachedRoomOpenedForJoin);
}

export function patchRoomTitleInCache(qc: QueryClient, roomId: string, title: string) {
  patchRoomInCache(qc, roomId, (draft) => {
    if (draft.sessionKind === 'circle') {
      draft.title = title;
      return;
    }
    if ('title' in draft) {
      draft.title = title;
    }
  });
}

export function patchRoomBecameCircleInCache(qc: QueryClient, roomId: string) {
  patchRoomInCache(qc, roomId, (draft) => {
    if ('sessionKind' in draft && draft.sessionKind === 'circle') {
      draft.roomType = 'circle';
      return;
    }
    if ('userA' in draft) {
      draft.roomType = 'circle';
    }
  });
}
