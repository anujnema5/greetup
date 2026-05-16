import { roomsRepository } from "@/modules/rooms/repositories/rooms.repository";

import { DeleteScheduledCircleError } from "../types/delete-scheduled-circle.types";

export async function deleteScheduledCircleService(hostUserId: string, roomId: string) {
  const row = await roomsRepository.cancelScheduledCircleByHost(roomId, hostUserId);
  if (!row) {
    throw new DeleteScheduledCircleError(
      "Circle not found, or you cannot delete it",
      "ROOM_NOT_FOUND",
      404,
    );
  }
  return { cancelled: true as const };
}
