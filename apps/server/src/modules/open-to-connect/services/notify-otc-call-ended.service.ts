import logger from "@/core/logging";
import { roomParticipantsRepository } from "@/modules/rooms/repositories/room-participants.repository";
import { roomsRepository } from "@/modules/rooms/repositories/rooms.repository";

import { isOtcCallRoom } from "../lib/otc-call-room";
import { otcSocketService } from "./otc-socket.service";

/**
 * Open-to-connect direct call — tells the remaining peer to hang up (no rematch).
 * Returns true when the room was OTC and the peer was notified.
 */
export async function notifyOtcCallPeerEnded(
  roomId: string,
  leavingUserId: string,
): Promise<boolean> {
  if (!(await isOtcCallRoom(roomId))) {
    return false;
  }

  const room = await roomsRepository.findRoomById(roomId);
  if (!room || room.roomType !== "direct" || room.sessionKind !== "match") {
    return false;
  }

  const participantIds = await roomParticipantsRepository.listAllParticipantUserIds(roomId);
  const peerUserId = participantIds.find((id) => id !== leavingUserId);
  if (!peerUserId) {
    return false;
  }

  logger.info("[leaveRoom] notifying peer open-to-connect call ended", {
    roomId,
    leavingUserId,
    peerUserId,
  });
  otcSocketService.emitCallEnded(peerUserId, { roomId, endedByUserId: leavingUserId });
  return true;
}
