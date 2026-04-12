/**
 * Aligns with Postgres `room_type`, RTC JWT `roomType`, and Redis session-room hash.
 */
export type RoomSessionType = "direct" | "circle";

export function isRoomSessionType(value: unknown): value is RoomSessionType {
  return value === "direct" || value === "circle";
}
