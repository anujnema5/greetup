/**
 * Aligns with Postgres `room_type`, RTC JWT `roomType`, and Redis session-room hash.
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
  if (isGroupRoomSessionType(value)) return "space";
  return null;
}
