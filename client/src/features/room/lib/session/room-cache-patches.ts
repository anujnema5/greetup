import type { RoomData } from '@/features/matching/types/room.types';
import { isSpaceRoomData } from '@/features/matching/types/room.types';
import { isSpaceSession } from '@/features/room/lib/session/room-session-kind';

/** After `space:opened_for_join` — space is live and the host lobby gate is cleared. */
export function patchCachedRoomOpenedForJoin(draft: RoomData): void {
  if (!isSpaceSession(draft) || !isSpaceRoomData(draft)) return;
  draft.status = 'live';
  draft.lobbyGateActive = '0';
}
