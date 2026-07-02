import logger from "@/core/logging";
import { notifySpaceInviteReceived } from "../notifications";
import {
  assertInviteesAllowRoomInvitesFromHost,
  randomInviteCode,
  resolveValidatedInviteeIds,
} from "./create-space.service";
import type { RoomAdvancedOptions } from "@/core/database/schema";
import { isRoomCategoryPickable } from "@/modules/rooms/constants/room-category-picker.constants";
import { roomCategoriesRepository } from "@/modules/rooms/repositories/room-categories.repository";
import { roomInvitesRepository } from "@/modules/rooms/repositories/room-invites.repository";
import { roomScheduledSpacesRepository } from "@/modules/rooms/repositories/room-scheduled-spaces.repository";
import { roomsRepository } from "@/modules/rooms/repositories/rooms.repository";

import type { UpdateScheduledSpaceBody } from "../schemas/update-scheduled-space.schema";
import { CreateSpaceError } from "../types/create-space.types";
import { UpdateScheduledSpaceError, type UpdateScheduledSpaceErrorCode } from "../types/update-scheduled-space.types";

function rejectUpdateScheduledSpace(
  hostUserId: string,
  roomId: string,
  message: string,
  code: UpdateScheduledSpaceErrorCode,
  statusCode: 400 | 404,
): never {
  logger.warn("scheduled_space_update_rejected", { hostUserId, roomId, code, message });
  throw new UpdateScheduledSpaceError(message, code, statusCode);
}

function wrapInviteErrors<T>(fn: () => Promise<T>): Promise<T> {
  return fn().catch((e: unknown) => {
    if (e instanceof CreateSpaceError) {
      if (
        e.code === "INVALID_INVITEES" ||
        e.code === "INVITEE_RESTRICTED_ROOM_INVITES" ||
        e.code === "INVITES_EXCEED_CAPACITY"
      ) {
        throw new UpdateScheduledSpaceError(
          e.message,
          e.code as UpdateScheduledSpaceErrorCode,
          400,
        );
      }
    }
    throw e;
  });
}

export async function updateScheduledSpaceService(
  hostUserId: string,
  roomId: string,
  body: UpdateScheduledSpaceBody,
) {
  const room = await roomsRepository.findRoomById(roomId);
  if (!room || room.hostUserId !== hostUserId || room.roomType !== "space" || room.status !== "scheduled") {
    rejectUpdateScheduledSpace(
      hostUserId,
      roomId,
      "Space not found, or you cannot edit it",
      "ROOM_NOT_FOUND",
      404,
    );
  }

  if (body.categoryId !== undefined) {
    const cat = await roomCategoriesRepository.findActiveCategoryById(body.categoryId);
    if (!cat) {
      rejectUpdateScheduledSpace(
        hostUserId,
        roomId,
        "Category not found or inactive",
        "CATEGORY_NOT_FOUND",
        404,
      );
    }
    if (!isRoomCategoryPickable(cat.slug)) {
      rejectUpdateScheduledSpace(
        hostUserId,
        roomId,
        "Category not available for spaces",
        "CATEGORY_NOT_FOUND",
        404,
      );
    }
  }

  const nextMaxParticipants = body.maxParticipants ?? room.maxParticipants;
  let resolvedInviteeIds: string[] | undefined;
  if (body.invitedUserIds !== undefined) {
    if (body.invitedUserIds.length > nextMaxParticipants - 1) {
      rejectUpdateScheduledSpace(
        hostUserId,
        roomId,
        `You can invite at most ${nextMaxParticipants - 1} ${nextMaxParticipants - 1 === 1 ? "person" : "people"} for a ${nextMaxParticipants}-seat space (you use one seat).`,
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

  const result = await roomScheduledSpacesRepository.updateScheduledSpaceByHost({
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
      rejectUpdateScheduledSpace(
        hostUserId,
        roomId,
        "Space not found, or you cannot edit it",
        "ROOM_NOT_FOUND",
        404,
      );
    }
    if (result.reason === "INVALID_SCHEDULE") {
      rejectUpdateScheduledSpace(
        hostUserId,
        roomId,
        "Scheduled start must be in the future",
        "INVALID_SCHEDULE",
        400,
      );
    }
    if (result.reason === "ROOM_FULL") {
      rejectUpdateScheduledSpace(
        hostUserId,
        roomId,
        "Cannot set seats below the number of people already in this space",
        "ROOM_FULL",
        400,
      );
    }
    rejectUpdateScheduledSpace(
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
        await notifySpaceInviteReceived({
          recipientUserId: inviteeUserId,
          actorUserId: hostUserId,
          roomId,
          roomTitle: body.title?.trim() ?? room.title,
        });
      }
    }
  }

  logger.info("scheduled_space_updated", { hostUserId, roomId, title: result.title });
  return {
    room: {
      id: result.id,
      title: result.title,
      scheduledStartAt: result.scheduledStartAt?.toISOString() ?? null,
    },
  };
}
