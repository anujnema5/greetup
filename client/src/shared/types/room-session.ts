/**
 * Aligns with Postgres `rooms.room_type`, RTC JWT `roomType`, and match-pair expand payloads.
 */
export type RoomSessionType = "direct" | "space";

export function isGroupRoomSessionType(value: unknown): boolean {
  return value === "space";
}
