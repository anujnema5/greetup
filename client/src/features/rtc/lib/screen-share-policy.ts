export type RtcRoomType = "direct" | "circle";

/** Client-side guard for screen share UX; server enforces single screen in direct rooms. */
export function canUseScreenShare(roomType: RtcRoomType | null | undefined): boolean {
  switch (roomType ?? "direct") {
    case "direct":
      return true;
    case "circle":
      // Host / role-based rules will plug in here later.
      return false;
    default:
      return false;
  }
}
