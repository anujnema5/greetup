import logger from "@/core/logging";
import { emitToUser } from "@/core/socket/socket";
import { roomParticipantsRepository } from "@/modules/rooms/repositories/room-participants.repository";
import { roomsRepository } from "@/modules/rooms/repositories/rooms.repository";

/** Random match only — tells the remaining peer to start searching again. */
export async function notifyMatchPeerSkipped(
  roomId: string,
  skippingUserId: string,
): Promise<void> {
  const room = await roomsRepository.findRoomById(roomId);
  if (!room || room.roomType !== "direct" || room.sessionKind !== "match") {
    return;
  }

  const participantIds = await roomParticipantsRepository.listAllParticipantUserIds(roomId);
  const peerUserId = participantIds.find((id) => id !== skippingUserId);
  if (!peerUserId) {
    return;
  }

  logger.info("[leaveRoom] notifying peer to rematch after partner skip", {
    roomId,
    skippingUserId,
    peerUserId,
  });
  emitToUser(peerUserId, "match:partner_skipped", { roomId });
}
