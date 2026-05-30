import logger from "@/core/logging";
import { notifyCircleInviteReceived } from "../notifications";
import {
  assertInviteesAllowRoomInvitesFromHost,
  randomInviteCode,
  resolveValidatedInviteeIds,
} from "./create-circle.service";
import type { RoomAdvancedOptions } from "@/core/database/schema";
import { roomCategoriesRepository } from "@/modules/rooms/repositories/room-categories.repository";
import { roomInvitesRepository } from "@/modules/rooms/repositories/room-invites.repository";
import { roomScheduledCirclesRepository } from "@/modules/rooms/repositories/room-scheduled-circles.repository";
import { roomsRepository } from "@/modules/rooms/repositories/rooms.repository";

import type { UpdateScheduledCircleBody } from "../schemas/update-scheduled-circle.schema";
import { CreateCircleError } from "../types/create-circle.types";
import { UpdateScheduledCircleError, type UpdateScheduledCircleErrorCode } from "../types/update-scheduled-circle.types";

function rejectUpdateScheduledCircle(
  hostUserId: string,
  roomId: string,
  message: string,
  code: UpdateScheduledCircleErrorCode,
  statusCode: 400 | 404,
): never {
  logger.warn("scheduled_circle_update_rejected", { hostUserId, roomId, code, message });
  throw new UpdateScheduledCircleError(message, code, statusCode);
}

function wrapInviteErrors<T>(fn: () => Promise<T>): Promise<T> {
  return fn().catch((e: unknown) => {
    if (e instanceof CreateCircleError) {
      if (
        e.code === "INVALID_INVITEES" ||
        e.code === "INVITEE_RESTRICTED_ROOM_INVITES" ||
        e.code === "INVITES_EXCEED_CAPACITY"
      ) {
        throw new UpdateScheduledCircleError(
          e.message,
          e.code as UpdateScheduledCircleErrorCode,
          400,
        );
      }
    }
    throw e;
  });
}

export async function updateScheduledCircleService(
  hostUserId: string,
  roomId: string,
  body: UpdateScheduledCircleBody,
) {
  const room = await roomsRepository.findRoomById(roomId);
  if (!room || room.hostUserId !== hostUserId || room.roomType !== "circle" || room.status !== "scheduled") {
    rejectUpdateScheduledCircle(
      hostUserId,
      roomId,
      "Circle not found, or you cannot edit it",
      "ROOM_NOT_FOUND",
      404,
    );
  }

  if (body.categoryId !== undefined) {
    const cat = await roomCategoriesRepository.findActiveCategoryById(body.categoryId);
    if (!cat) {
      rejectUpdateScheduledCircle(
        hostUserId,
        roomId,
        "Category not found or inactive",
        "CATEGORY_NOT_FOUND",
        404,
      );
    }
  }

  const nextMaxParticipants = body.maxParticipants ?? room.maxParticipants;
  let resolvedInviteeIds: string[] | undefined;
  if (body.invitedUserIds !== undefined) {
    if (body.invitedUserIds.length > nextMaxParticipants - 1) {
      rejectUpdateScheduledCircle(
        hostUserId,
        roomId,
        `You can invite at most ${nextMaxParticipants - 1} ${nextMaxParticipants - 1 === 1 ? "person" : "people"} for a ${nextMaxParticipants}-seat circle (you use one seat).`,
        "INVITES_EXCEED_CAPACITY",
        400,
      );
    }
    resolvedInviteeIds = await wrapInviteErrors(() =>
      resolveValidatedInviteeIds(hostUserId, body.invitedUserIds),
    );
    await wrapInviteErrors(() =>
      assertInviteesAllowRoomInvitesFromHost(hostUserId, resolvedInviteeIds!),
    );
  }

  const scheduledStartAt =
    body.scheduledStartAt !== undefined ? new Date(body.scheduledStartAt) : undefined;
  const scheduledEndAt =
    body.scheduledEndAt === undefined
      ? undefined
      : body.scheduledEndAt === null
        ? null
        : new Date(body.scheduledEndAt);

  const description =
    body.description === undefined
      ? undefined
      : body.description === null
        ? null
        : body.description.trim() === ""
          ? null
          : body.description.trim();

  let inviteCode: string | null | undefined;
  if (body.visibility === "public") {
    inviteCode = null;
  } else if (body.visibility === "private") {
    if (room.visibility === "public" || !room.inviteCode) {
      inviteCode = randomInviteCode();
    }
  }

  const advancedOptionsPatch: Partial<RoomAdvancedOptions> | undefined =
    body.advancedOptions === undefined ? undefined : (body.advancedOptions as Partial<RoomAdvancedOptions>);

  const beforePending = await roomInvitesRepository.listPendingInviteeUserIds(roomId);
  const beforeSet = new Set(beforePending);

  const result = await roomScheduledCirclesRepository.updateScheduledCircleByHost({
    roomId,
    hostUserId,
    title: body.title,
    categoryId: body.categoryId,
    description,
    visibility: body.visibility,
    maxParticipants: body.maxParticipants,
    scheduledStartAt,
    scheduledEndAt,
    advancedOptionsPatch,
    inviteCode,
    invitedUserIds: resolvedInviteeIds,
  });

  if (!result.ok) {
    if (result.reason === "NOT_FOUND") {
      rejectUpdateScheduledCircle(
        hostUserId,
        roomId,
        "Circle not found, or you cannot edit it",
        "ROOM_NOT_FOUND",
        404,
      );
    }
    if (result.reason === "INVALID_SCHEDULE") {
      rejectUpdateScheduledCircle(
        hostUserId,
        roomId,
        "Scheduled start must be in the future",
        "INVALID_SCHEDULE",
        400,
      );
    }
    if (result.reason === "ROOM_FULL") {
      rejectUpdateScheduledCircle(
        hostUserId,
        roomId,
        "Cannot set seats below the number of people already in this circle",
        "ROOM_FULL",
        400,
      );
    }
    rejectUpdateScheduledCircle(
      hostUserId,
      roomId,
      "scheduledEndAt must be after scheduledStartAt",
      "INVALID_END",
      400,
    );
  }

  if (resolvedInviteeIds) {
    for (const inviteeUserId of resolvedInviteeIds) {
      if (!beforeSet.has(inviteeUserId)) {
        await notifyCircleInviteReceived({
          recipientUserId: inviteeUserId,
          actorUserId: hostUserId,
          roomId,
          roomTitle: body.title?.trim() ?? room.title,
        });
      }
    }
  }

  logger.info("scheduled_circle_updated", { hostUserId, roomId, title: result.title });
  return {
    room: {
      id: result.id,
      title: result.title,
      scheduledStartAt: result.scheduledStartAt?.toISOString() ?? null,
    },
  };
}
