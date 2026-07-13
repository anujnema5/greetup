/**
 * Aligns with Postgres `rooms.room_type`, RTC JWT `roomType`, and Redis/session payloads.
 */
export type RoomSessionType = "direct" | "space";

export function isRoomSessionType(value: unknown): value is RoomSessionType {
  return value === "direct" || value === "space";
}

/** True when the room type is a group space (not direct). */
export function isGroupRoomSessionType(value: unknown): boolean {
  return value === "space";
}

export function normalizeRoomSessionType(value: unknown): RoomSessionType | null {
  if (value === "direct") return "direct";
  if (value === "space") return "space";
  return null;
}
