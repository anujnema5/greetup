/**
 * Aligns with Postgres `rooms.room_type`, RTC JWT `roomType`, and Redis/session payloads.
 */
export type RoomSessionType = "direct" | "space";

/** @deprecated Pre-migration 0032 value; still accepted when parsing Redis/API payloads. */
export const LEGACY_ROOM_SESSION_TYPE_CIRCLE = "circle" as const;

export function isRoomSessionType(value: unknown): value is RoomSessionType {
  return value === "direct" || value === "space";
}

/** True when the room type is a group space (not direct). Includes legacy `circle`. */
export function isGroupRoomSessionType(value: unknown): boolean {
  return value === "space" || value === LEGACY_ROOM_SESSION_TYPE_CIRCLE;
}

export function normalizeRoomSessionType(value: unknown): RoomSessionType | null {
  if (value === "direct") return "direct";
  if (isGroupRoomSessionType(value)) return "space";
  return null;
}
