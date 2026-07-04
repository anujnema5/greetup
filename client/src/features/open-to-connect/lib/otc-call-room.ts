import type { RoomData } from "@/features/matching/types/room.types";
import { isMatchSession } from "@/features/room/lib/session/room-session-kind";

type RoomWithOtcFlag = {
  sessionKind?: unknown;
  openToConnectOrigin?: unknown;
};

/** Open-to-connect 1:1 call — ends at home, never restarts match search. */
export function isOtcCallRoom(
  room: RoomWithOtcFlag | RoomData | null | undefined,
): boolean {
  if (!room || !isMatchSession(room)) return false;
  return "openToConnectOrigin" in room && room.openToConnectOrigin === true;
}
