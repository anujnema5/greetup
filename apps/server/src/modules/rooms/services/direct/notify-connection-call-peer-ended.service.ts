import logger from "@/core/logging";
import { emitConnectionCallEnded } from "@/modules/connections/socket/connection-call-socket.handler";
import { resolveConnectionCallConversationId } from "@/modules/rooms/lib/session/resolve-connection-call-conversation-id";
import { roomParticipantsRepository } from "@/modules/rooms/repositories/room-participants.repository";
import { roomsRepository } from "@/modules/rooms/repositories/rooms.repository";

/** Connection DM call — tells the remaining peer the call ended. */
export async function notifyConnectionCallPeerEnded(
  roomId: string,
  leavingUserId: string,
): Promise<void> {
  const room = await roomsRepository.findRoomById(roomId);
  if (!room || room.sessionKind !== "connection_call") {
    return;
  }

  const activeParticipantIds = await roomParticipantsRepository.listActiveParticipantUserIds(roomId);
  const peerUserId = activeParticipantIds.find((id) => id !== leavingUserId);
  if (!peerUserId) {
    return;
  }

  const conversationId = (await resolveConnectionCallConversationId(roomId)) ?? "";

  logger.info("[leaveRoom] notifying peer connection call ended", {
    roomId,
    leavingUserId,
    peerUserId,
  });
  emitConnectionCallEnded(peerUserId, {
    roomId,
    conversationId,
    endedByUserId: leavingUserId,
  });
}
