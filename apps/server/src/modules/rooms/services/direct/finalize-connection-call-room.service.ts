import logger from "@/core/logging";
import { finalizeConnectionCallHistory } from "@/modules/connections/services/connection-call-history.service";
import { endLiveRoomSession } from "@/modules/rooms/services/session/end-live-room-session.service";

/** Ends a live connection-call room when the last participant hangs up. Idempotent. */
export async function finalizeConnectionCallRoomSession(roomId: string): Promise<void> {
  logger.debug("connection_call_room_finalize_start", { roomId, sessionKind: "connection_call" });

  try {
    await finalizeConnectionCallHistory(roomId);
  } catch (error) {
    logger.error("connection_call_room_history_finalize_failed", { roomId, error });
  }

  const result = await endLiveRoomSession(roomId, "connection_call_ended", {
    preserveScheduledSlot: false,
    notifyParticipants: false,
  });

  logger.info("connection_call_room_finalized", {
    roomId,
    sessionKind: "connection_call",
    ended: result.ended,
    alreadyClosed: result.alreadyClosed,
    reason: result.reason,
  });
}
