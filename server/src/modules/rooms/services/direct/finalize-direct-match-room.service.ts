import logger from "@/core/logging";
import { finalizeConnectionCallHistory } from "@/modules/connections/services/connection-call-history.service";
import { endLiveRoomSession } from "@/modules/rooms/services/session/end-live-room-session.service";

/** Ends a live direct match room (DB + participants + `room:{id}` Redis). Idempotent. */
export async function finalizeDirectMatchRoomSession(roomId: string): Promise<void> {
  logger.debug("direct_match_room_finalize_start", { roomId });

  try {
    await finalizeConnectionCallHistory(roomId);
  } catch (error) {
    logger.error("direct_match_room_call_history_finalize_failed", { roomId, error });
  }

  const result = await endLiveRoomSession(roomId, "match_finalized", {
    preserveScheduledSlot: false,
    notifyParticipants: false,
  });

  logger.info("direct_match_room_finalized", {
    roomId,
    ended: result.ended,
    alreadyClosed: result.alreadyClosed,
    reason: result.reason,
  });
}
