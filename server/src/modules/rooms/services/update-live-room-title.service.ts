import { roomsRepository } from "@/modules/rooms/repositories/rooms.repository";
import { patchSessionRoomRedisTitle } from "@/modules/rooms/services/session-room-redis.service";

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
  | "NOT_CIRCLE"
  | "NOT_HOST"
  | "INVALID_TITLE";

const MAX_LEN = 160;

export async function updateLiveRoomTitleService(
  userId: string,
  roomId: string,
  rawTitle: string,
): Promise<{ title: string }> {
  const title = rawTitle.trim();
  if (!title || title.length > MAX_LEN) {
    throw new UpdateLiveRoomTitleError(
      `Title must be 1–${MAX_LEN} characters`,
      "INVALID_TITLE",
      400,
    );
  }

  const room = await roomsRepository.findRoomById(roomId);
  if (!room) {
    throw new UpdateLiveRoomTitleError("Room not found", "ROOM_NOT_FOUND", 404);
  }
  if (room.status !== "live") {
    throw new UpdateLiveRoomTitleError("Room is not live", "ROOM_NOT_LIVE", 400);
  }
  if (room.roomType !== "circle") {
    throw new UpdateLiveRoomTitleError("Only circle rooms can be renamed", "NOT_CIRCLE", 400);
  }
  if (room.hostUserId !== userId) {
    throw new UpdateLiveRoomTitleError("Only the host can rename this circle", "NOT_HOST", 403);
  }

  const updated = await roomsRepository.updateLiveRoomTitle(roomId, title);
  if (!updated) {
    throw new UpdateLiveRoomTitleError("Could not update title", "ROOM_NOT_FOUND", 404);
  }

  await patchSessionRoomRedisTitle(roomId, title);

  return { title };
}
