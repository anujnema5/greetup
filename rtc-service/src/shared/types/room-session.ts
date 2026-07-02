export type RoomSessionType = "direct" | "space";

/** @deprecated Pre-migration 0032 value; still accepted when parsing Redis/API payloads. */
export const LEGACY_ROOM_SESSION_TYPE_CIRCLE = "circle" as const;

export function isRoomSessionType(value: unknown): value is RoomSessionType {
  return value === "direct" || value === "space";
}

export function isGroupRoomSessionType(value: unknown): boolean {
  return value === "space" || value === LEGACY_ROOM_SESSION_TYPE_CIRCLE;
}
