import { roomsRepository } from "@/modules/rooms/repositories/rooms.repository";

import type { UpdateScheduledCircleBody } from "../schemas/update-scheduled-circle.schema";
import { UpdateScheduledCircleError } from "../types/update-scheduled-circle.types";

export async function updateScheduledCircleService(
  hostUserId: string,
  roomId: string,
  body: UpdateScheduledCircleBody,
) {
  const scheduledStartAt =
    body.scheduledStartAt !== undefined ? new Date(body.scheduledStartAt) : undefined;
  const scheduledEndAt =
    body.scheduledEndAt === undefined
      ? undefined
      : body.scheduledEndAt === null
        ? null
        : new Date(body.scheduledEndAt);

  const result = await roomsRepository.updateScheduledCircleByHost({
    roomId,
    hostUserId,
    title: body.title,
    scheduledStartAt,
    scheduledEndAt,
  });

  if (!result.ok) {
    if (result.reason === "NOT_FOUND") {
      throw new UpdateScheduledCircleError(
        "Circle not found, or you cannot edit it",
        "ROOM_NOT_FOUND",
        404,
      );
    }
    if (result.reason === "INVALID_SCHEDULE") {
      throw new UpdateScheduledCircleError(
        "Scheduled start must be in the future",
        "INVALID_SCHEDULE",
        400,
      );
    }
    throw new UpdateScheduledCircleError(
      "scheduledEndAt must be after scheduledStartAt",
      "INVALID_END",
      400,
    );
  }

  return {
    room: {
      id: result.id,
      title: result.title,
      scheduledStartAt: result.scheduledStartAt?.toISOString() ?? null,
    },
  };
}
