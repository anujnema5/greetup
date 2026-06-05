import logger from "@/core/logging";
import { endLiveRoomSession } from "@/modules/rooms/services/session/end-live-room-session.service";

/** Ends a live direct match room (DB + participants + `room:{id}` Redis). Idempotent. */
export async function finalizeDirectMatchRoomSession(roomId: string): Promise<void> {
  logger.debug("direct_match_room_finalize_start", { roomId, sessionKind: "match" });

  const result = await endLiveRoomSession(roomId, "match_finalized", {
    preserveScheduledSlot: false,
    notifyParticipants: false,
  });

  logger.info("direct_match_room_finalized", {
    roomId,
    sessionKind: "match",
    ended: result.ended,
    alreadyClosed: result.alreadyClosed,
    reason: result.reason,
  });
}
