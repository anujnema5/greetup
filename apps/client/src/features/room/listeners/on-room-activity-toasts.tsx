"use client";

import { useRoomActivityToasts } from "@/features/room/hooks/call/use-room-activity-toasts";

/** Toast feedback for in-call peer and screen-share activity. */
export function OnRoomActivityToasts() {
  useRoomActivityToasts();
  return null;
}
