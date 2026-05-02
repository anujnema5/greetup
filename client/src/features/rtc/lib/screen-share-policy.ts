import type { RoomSessionType } from "@/shared/types/room-session";

export type RtcRoomType = RoomSessionType;

/** Client-side guard for screen share UX (server allows multiple concurrent screen producers). */
export function canUseScreenShare(roomType: RtcRoomType | null | undefined): boolean {
  switch (roomType ?? "direct") {
    case "direct":
    case "circle":
      return true;
    default:
      return false;
  }
}
