import { GuestNotAllowedError } from "@/shared/errors";

import { guestProfileRepository } from "../../repositories/guest-profile.repository";

export type GuestRoomAccessShape = {
  roomType: "direct" | "circle";
  sessionKind: "match" | "connection_call" | "circle";
};

/** Guests may only enter direct rooms created by matchmaking (`sessionKind = match`). */
export function isGuestAllowedRoomAccess(room: GuestRoomAccessShape): boolean {
  return room.roomType === "direct" && room.sessionKind === "match";
}

/**
 * Enforces guest room restrictions (§7.1). No-op for registered users.
 * Call from `joinRoomService` and `issueRtcTokenService`.
 */
export async function assertGuestMayAccessRoom(
  userId: string,
  room: GuestRoomAccessShape,
): Promise<void> {
  const flags = await guestProfileRepository.findTrialFlagsByUserId(userId);
  if (!flags?.isGuest) {
    return;
  }

  if (!isGuestAllowedRoomAccess(room)) {
    throw new GuestNotAllowedError(
      "Sign up or log in to join circles and connection calls.",
    );
  }
}
