/**
 * Aligns with Postgres `room_type` and RTC JWT `roomType` (verified in `socket-jwt.middleware`).
 */
export type RoomSessionType = "direct" | "circle";

export function isRoomSessionType(value: unknown): value is RoomSessionType {
  return value === "direct" || value === "circle";
}
