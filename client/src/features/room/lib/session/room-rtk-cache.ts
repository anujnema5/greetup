import type { RoomSessionType } from "@/shared/types/room-session";

import type { RoomData } from "@/features/matching/types/room.types";
import { CONNECTIONS_PEERS_CALL_STATUS_TAG } from "@/features/connections/api/connections-rtk-cache-tags";

export function roomEntityTag(roomId: string) {
  return { type: "Room" as const, id: roomId };
}

/**
 * After a direct call becomes a circle in place: refresh room metadata and connection badges.
 * Intentionally does **not** touch `RtcToken` (see `OnDirectExpandedToCircle`).
 */
export function invalidateRoomAndPeersCallStatusTags(roomId: string) {
  return [roomEntityTag(roomId), CONNECTIONS_PEERS_CALL_STATUS_TAG] as const;
}

/** Patch cached RTC token shape when the server promotes the room without reissuing JWT. */
export function patchCachedRtcRoomType(roomType: RoomSessionType) {
  return (draft: { roomType?: RoomSessionType } | undefined) => {
    if (draft) draft.roomType = roomType;
  };
}

/** After `circle:opened_for_join` — circle is live and the host lobby gate is cleared. */
export function patchCachedRoomOpenedForJoin(draft: RoomData): void {
  if (draft.sessionKind !== "db_room") return;
  draft.status = "live";
  draft.lobbyGateActive = "0";
}
