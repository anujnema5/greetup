import logger from "@/core/logging";
import { emitToUser } from "@/core/socket/socket";
import { SPACE_ROOM_SOCKET_EVENTS } from "@/modules/rooms/constants/events/space-room-socket.events";
import { roomsRepository } from "@/modules/rooms/repositories/rooms.repository";
import { roomParticipantsRepository } from "@/modules/rooms/repositories/room-participants.repository";
import { patchSessionRoomRedisTitle } from "@/modules/rooms/services/rtc/session-room-redis.service";

async function emitSpaceTitleUpdated(roomId: string, title: string): Promise<void> {
  const userIds = await roomParticipantsRepository.listAllParticipantUserIds(roomId);
  const payload = { roomId, title };
  for (const uid of userIds) {
    emitToUser(uid, SPACE_ROOM_SOCKET_EVENTS.titleUpdated, payload);
  }
}

export class UpdateLiveRoomTitleError extends Error {
  constructor(
    message: string,
    public readonly code: UpdateLiveRoomTitleErrorCode,
    public readonly statusCode: number,
  ) {
    super(message);
    this.name = "UpdateLiveRoomTitleError";
  }
}

export type UpdateLiveRoomTitleErrorCode =
  | "ROOM_NOT_FOUND"
  | "ROOM_NOT_LIVE"
  | "NOT_SPACE"
  | "NOT_HOST"
  | "INVALID_TITLE";

const MAX_LEN = 160;

function rejectUpdateLiveRoomTitle(
  userId: string,
  roomId: string,
  message: string,
  code: UpdateLiveRoomTitleErrorCode,
  statusCode: number,
): never {
  logger.warn("space_title_update_rejected", { userId, roomId, code, message });
  throw new UpdateLiveRoomTitleError(message, code, statusCode);
}

export async function updateLiveRoomTitleService(
  userId: string,
  roomId: string,
  rawTitle: string,
): Promise<{ title: string }> {
  const title = rawTitle.trim();
  if (!title || title.length > MAX_LEN) {
    rejectUpdateLiveRoomTitle(
      userId,
      roomId,
      `Title must be 1–${MAX_LEN} characters`,
      "INVALID_TITLE",
      400,
    );
  }

  const room = await roomsRepository.findRoomById(roomId);
  if (!room) {
    rejectUpdateLiveRoomTitle(userId, roomId, "Room not found", "ROOM_NOT_FOUND", 404);
  }
  if (room.status !== "live") {
    rejectUpdateLiveRoomTitle(userId, roomId, "Room is not live", "ROOM_NOT_LIVE", 400);
  }
  if (room.roomType !== "space") {
    rejectUpdateLiveRoomTitle(userId, roomId, "Only space rooms can be renamed", "NOT_SPACE", 400);
  }
  if (room.hostUserId !== userId) {
    rejectUpdateLiveRoomTitle(userId, roomId, "Only the host can rename this space", "NOT_HOST", 403);
  }

  const updated = await roomsRepository.updateLiveRoomTitle(roomId, title);
  if (!updated) {
    rejectUpdateLiveRoomTitle(userId, roomId, "Could not update title", "ROOM_NOT_FOUND", 404);
  }

  await patchSessionRoomRedisTitle(roomId, title);
  await emitSpaceTitleUpdated(roomId, title);

  logger.info("space_live_title_updated", { userId, roomId, title });
  return { title };
}
