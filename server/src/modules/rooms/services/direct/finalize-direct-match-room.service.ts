import { endLiveRoomSession } from "@/modules/rooms/services/session/end-live-room-session.service";

/** Ends a live direct match room (DB + participants + `room:{id}` Redis). Idempotent. */
export async function finalizeDirectMatchRoomSession(roomId: string): Promise<void> {
  await endLiveRoomSession(roomId, "match_finalized", {
    preserveScheduledSlot: false,
    notifyParticipants: false,
  });
}
