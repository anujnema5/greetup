"use client";

import { useRoomSessionExpiryWarnings } from "@/features/room/hooks/session/use-room-session-expiry-warnings";

/** Isolates GET `/room/:id` subscription so call shell does not re-render on expiry refresh. */
export function RoomSessionExpiryWarningsLayer({
  roomId,
  enabled,
}: {
  roomId: string;
  enabled: boolean;
}) {
  useRoomSessionExpiryWarnings(roomId, enabled);
  return null;
}
