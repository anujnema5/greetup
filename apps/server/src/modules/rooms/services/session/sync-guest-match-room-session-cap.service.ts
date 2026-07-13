import logger from "@/core/logging";
import {
  computeGuestMatchRoomSessionExpiresAt,
  includesGuestParticipant,
} from "@/modules/guest";
import { roomParticipantsRepository } from "@/modules/rooms/repositories/room-participants.repository";
import { roomsRepository } from "@/modules/rooms/repositories/rooms.repository";
import { roomSessionsRepository } from "@/modules/rooms/repositories/room-sessions.repository";

/**
 * When a direct match room includes a guest, cap live session duration at 10 minutes
 * by persisting a sooner `expires_at` (reconcile + client countdown use this).
 */
export async function syncGuestMatchRoomSessionCap(roomId: string): Promise<void> {
  const room = await roomsRepository.findRoomById(roomId);
  if (
    !room ||
    room.roomType !== "direct" ||
    room.sessionKind !== "match" ||
    room.status !== "live" ||
    !room.startedAt
  ) {
    return;
  }

  const participantUserIds = await roomParticipantsRepository.listParticipantUserIds(roomId);
  if (!(await includesGuestParticipant(participantUserIds))) {
    return;
  }

  const capExpiresAt = computeGuestMatchRoomSessionExpiresAt(room.startedAt);
  await roomSessionsRepository.applyExpiresAtCapIfSooner(roomId, capExpiresAt);

  logger.info("guest_match_room_session_cap_applied", {
    roomId,
    capExpiresAt: capExpiresAt.toISOString(),
  });
}
