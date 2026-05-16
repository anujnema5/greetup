export type RoomSessionType = "direct" | "circle";

export function isRoomSessionType(value: unknown): value is RoomSessionType {
  return value === "direct" || value === "circle";
}
