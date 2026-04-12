import type { RoomSessionType } from "@/shared/types/room-session";

/** RTK Query tag: batch peer “online / in call” query (`peersCallStatus`). */
export const CONNECTIONS_PEERS_CALL_STATUS_TAG = {
  type: "Connections" as const,
  id: "PEERS_CALL_STATUS" as const,
};

export function roomEntityTag(roomId: string) {
  return { type: "Room" as const, id: roomId };
}

/**
 * After a direct call becomes a circle in place: refresh room metadata and connection badges.
 * Intentionally does **not** touch `RtcToken` (see `RoomDirectExpandSocketBridge`).
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
