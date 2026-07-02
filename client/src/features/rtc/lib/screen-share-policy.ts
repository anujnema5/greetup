import type { RoomSessionType } from "@/shared/types/room-session";

import { isGroupRoomSessionType } from "@/shared/types/room-session";

export type RtcRoomType = RoomSessionType;

export const MAX_CONCURRENT_SCREEN_SHARES = 2;

/** Client-side guard for screen share UX (server allows multiple concurrent screen producers). */
export function canUseScreenShare(roomType: RtcRoomType | null | undefined): boolean {
  if (!roomType || roomType === "direct") return true;
  if (isGroupRoomSessionType(roomType)) return true;
  return false;
}
