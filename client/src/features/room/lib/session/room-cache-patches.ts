import type { RoomData } from '@/features/matching/types/room.types';

/** After `circle:opened_for_join` — circle is live and the host lobby gate is cleared. */
export function patchCachedRoomOpenedForJoin(draft: RoomData): void {
  if (draft.sessionKind !== 'circle') return;
  draft.status = 'live';
  draft.lobbyGateActive = '0';
}
