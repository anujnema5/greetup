import logger from "@/core/logging";
import { roomScheduledCirclesRepository } from "@/modules/rooms/repositories/room-scheduled-circles.repository";

import { DeleteScheduledCircleError } from "../types/delete-scheduled-circle.types";

export async function deleteScheduledCircleService(hostUserId: string, roomId: string) {
  const row = await roomScheduledCirclesRepository.cancelScheduledCircleByHost(roomId, hostUserId);
  if (!row) {
    logger.warn("scheduled_circle_delete_rejected", {
      hostUserId,
      roomId,
      code: "ROOM_NOT_FOUND",
      message: "Circle not found, or you cannot delete it",
    });
    throw new DeleteScheduledCircleError(
      "Circle not found, or you cannot delete it",
      "ROOM_NOT_FOUND",
      404,
    );
  }
  logger.info("scheduled_circle_deleted", { hostUserId, roomId });
  return { cancelled: true as const };
}
