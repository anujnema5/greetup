import logger from "@/core/logging";
import { roomSessionsRepository } from "@/modules/rooms/repositories/room-sessions.repository";
import { reconcileRoomSessionOnAccess } from "@/modules/rooms/services/session/reconcile-room-session-on-access.service";
import type {
  SweepDueRoomSessionsOptions,
  SweepDueRoomSessionsResult,
} from "@/modules/rooms/types";

/**
 * Background / list-circles: full session teardown for wall-clock due rooms (not only `is_expired`).
 */
export async function sweepDueRoomSessions(
  options: SweepDueRoomSessionsOptions = {},
): Promise<SweepDueRoomSessionsResult> {
  const maxRooms = options.maxRooms ?? 100;
  const candidateIds = await roomSessionsRepository.listRoomIdsDueForSessionSweep(maxRooms);
  const endedIds: string[] = [];

  for (const roomId of candidateIds) {
    const result = await reconcileRoomSessionOnAccess(roomId);
    if (result.closed && !result.alreadyWasClosed) {
      endedIds.push(roomId);
    }
  }

  if (endedIds.length > 0) {
    logger.info("room_session_sweep", {
      candidates: candidateIds.length,
      ended: endedIds.length,
      roomIds: endedIds,
    });
  }

  return {
    candidates: candidateIds.length,
    ended: endedIds.length,
    roomIds: endedIds,
  };
}
