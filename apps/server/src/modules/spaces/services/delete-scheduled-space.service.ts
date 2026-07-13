import logger from "@/core/logging";
import { roomScheduledSpacesRepository } from "@/modules/rooms/repositories/room-scheduled-spaces.repository";

import { DeleteScheduledSpaceError } from "../types/delete-scheduled-space.types";

export async function deleteScheduledSpaceService(hostUserId: string, roomId: string) {
  const row = await roomScheduledSpacesRepository.cancelScheduledSpaceByHost(roomId, hostUserId);
  if (!row) {
    logger.warn("scheduled_space_delete_rejected", {
      hostUserId,
      roomId,
      code: "ROOM_NOT_FOUND",
      message: "Space not found, or you cannot delete it",
    });
    throw new DeleteScheduledSpaceError(
      "Space not found, or you cannot delete it",
      "ROOM_NOT_FOUND",
      404,
    );
  }
  logger.info("scheduled_space_deleted", { hostUserId, roomId });
  return { cancelled: true as const };
}
