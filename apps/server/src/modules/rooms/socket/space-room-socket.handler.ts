import { emitToUser } from "@/core/socket/socket";
import { SPACE_ROOM_SOCKET_EVENTS } from "@/modules/rooms/constants/events/space-room-socket.events";
import { roomParticipantsRepository } from "@/modules/rooms/repositories/room-participants.repository";

/**
 * Tells active participants they may obtain an RTC token (lobby gate cleared or space went live
 * without a host-controlled lobby).
 */
export async function emitSpaceOpenedForJoin(
  roomId: string,
  options?: { excludeUserId?: string },
): Promise<void> {
  const payload = { roomId };
  const userIds = await roomParticipantsRepository.listActiveParticipantUserIds(roomId);
  const exclude = options?.excludeUserId;

  for (const uid of userIds) {
    if (exclude && uid === exclude) continue;
    emitToUser(uid, SPACE_ROOM_SOCKET_EVENTS.openedForJoin, payload);
  }
}
