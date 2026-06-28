import { randomBytes } from "crypto";

import logger from "@/core/logging";
import { mergeRoomAdvancedOptions } from "@/core/database/schema";
import { getAcceptedPeerIdsForUser } from "@/modules/connections/services/accepted-peer-ids.service";
import { notifySpaceInviteReceived } from "../notifications";
import { notifySpaceStartedToAssociatedUsers } from "@/modules/rooms/notifications";
import {
  canHostInviteUserToRoom,
  getRoomInvitePreferencesForUsers,
} from "@/modules/profile/services/room-invite-preferences.service";
import { isRoomCategoryPickable } from "@/modules/rooms/constants/room-category-picker.constants";
import { roomCategoriesRepository } from "@/modules/rooms/repositories/room-categories.repository";
import { roomCreationRepository } from "@/modules/rooms/repositories/room-creation.repository";
import { provisionSessionRoomRedis } from "@/modules/rooms/services/rtc/session-room-redis.service";
import type { CreateSpaceBody } from "../schemas/create-space.schema";
import { CreateSpaceError, type CreateSpaceErrorCode } from "../types/create-space.types";

function rejectCreateSpace(
  hostUserId: string,
  message: string,
  code: CreateSpaceErrorCode,
): never {
  logger.warn("space_create_rejected", { hostUserId, code, message });
  throw new CreateSpaceError(message, code);
}

export function randomInviteCode(): string {
  return randomBytes(9).toString("base64url").replace(/[^a-zA-Z0-9]/g, "").slice(0, 12);
}

/**
 * Trim, drop host/empty, dedupe order-preserving — avoids duplicate (room, invitee) rows
 * when the client sends the same id twice or with accidental whitespace.
 */
function normalizeInviteeIds(
  hostUserId: string,
  invitedUserIds: string[] | undefined,
): string[] {
  if (!invitedUserIds?.length) return [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of invitedUserIds) {
    if (typeof raw !== "string") continue;
    const id = raw.trim();
    if (!id || id === hostUserId) continue;
    if (seen.has(id)) continue;
    seen.add(id);
    out.push(id);
  }
  return out;
}

export async function resolveValidatedInviteeIds(
  hostUserId: string,
  invitedUserIds: string[] | undefined,
): Promise<string[]> {
  const unique = normalizeInviteeIds(hostUserId, invitedUserIds);
  if (unique.length === 0) return [];

  const peerIds = await getAcceptedPeerIdsForUser(hostUserId);

  for (const id of unique) {
    if (!peerIds.has(id)) {
      rejectCreateSpace(
        hostUserId,
        "You can only invite users you are connected with",
        "INVALID_INVITEES",
      );
    }
  }

  return unique;
}

export async function assertInviteesAllowRoomInvitesFromHost(
  hostUserId: string,
  inviteeIds: string[],
): Promise<void> {
  if (inviteeIds.length === 0) return;

  const prefs = await getRoomInvitePreferencesForUsers(inviteeIds);
  for (const inviteeId of inviteeIds) {
    const p = prefs.get(inviteeId) ?? {
      policy: "all_connections" as const,
      allowlistedUserIds: [],
    };
    if (!canHostInviteUserToRoom(hostUserId, p)) {
      rejectCreateSpace(
        hostUserId,
        "One or more people do not allow room invites from you. Change who can invite them in Profile, or remove them from the invite list.",
        "INVITEE_RESTRICTED_ROOM_INVITES",
      );
    }
  }
}

export async function createSpaceService(
  hostUserId: string,
  body: CreateSpaceBody,
) {
  const category = await roomCategoriesRepository.findActiveCategoryById(body.categoryId);

  if (!category) {
    rejectCreateSpace(hostUserId, "Category not found or inactive", "CATEGORY_NOT_FOUND");
  }

  if (!isRoomCategoryPickable(category.slug)) {
    rejectCreateSpace(hostUserId, "Category not available for spaces", "CATEGORY_NOT_FOUND");
  }

  const now = new Date();
  const advancedOptions = mergeRoomAdvancedOptions(body.advancedOptions);

  const scheduledStartAt =
    body.scheduleMode === "scheduled" && body.scheduledStartAt
      ? new Date(body.scheduledStartAt)
      : null;

  const scheduledEndAt = body.scheduledEndAt
    ? new Date(body.scheduledEndAt)
    : null;

  if (body.scheduleMode === "scheduled" && scheduledStartAt && scheduledStartAt <= now) {
    rejectCreateSpace(hostUserId, "Scheduled start must be in the future", "INVALID_SCHEDULE");
  }

  const inviteeIds = await resolveValidatedInviteeIds(
    hostUserId,
    body.invitedUserIds,
  );

  const maxInvitees = body.maxParticipants - 1;
  if (inviteeIds.length > maxInvitees) {
    rejectCreateSpace(
      hostUserId,
      `You can invite at most ${maxInvitees} ${maxInvitees === 1 ? "person" : "people"} for a ${body.maxParticipants}-seat space (you use one seat).`,
      "INVITES_EXCEED_CAPACITY",
    );
  }

  await assertInviteesAllowRoomInvitesFromHost(hostUserId, inviteeIds);

  const isInstant = body.scheduleMode === "instant";
  const status = isInstant ? "live" : "scheduled";
  const startedAt = isInstant ? now : null;
  const inviteCode = body.visibility === "private" ? randomInviteCode() : null;

  const roomType = body.roomType ?? "space";

  const row = await roomCreationRepository.createRoomWithHostAndInvites({
    categoryId: body.categoryId,
    hostUserId,
    title: body.title,
    description: body.description ?? null,
    visibility: body.visibility,
    maxParticipants: body.maxParticipants,
    scheduledStartAt,
    scheduledEndAt,
    status,
    startedAt,
    inviteCode,
    advancedOptions,
    inviteeUserIds: inviteeIds,
    roomType,
  });

  if (row.status === "live") {
    await provisionSessionRoomRedis({
      roomId: row.id,
      hostUserId,
      roomType,
      title: body.title.trim(),
      lobbyGateActive: advancedOptions.shouldHostStartMeeting !== false,
    });
  }

  if (inviteeIds.length > 0) {
    const roomTitle = body.title.trim();
    if (row.status === "live") {
      await notifySpaceStartedToAssociatedUsers({
        roomId: row.id,
        hostUserId,
        roomTitle,
      });
    } else {
      await Promise.all(
        inviteeIds.map((inviteeUserId) =>
          notifySpaceInviteReceived({
            recipientUserId: inviteeUserId,
            actorUserId: hostUserId,
            roomId: row.id,
            roomTitle,
          }),
        ),
      );
    }
  }

  logger.info("space_created", {
    hostUserId,
    roomId: row.id,
    status: row.status,
    roomType,
    friendInvitesCreated: inviteeIds.length,
  });

  return {
    room: row,
    category: {
      id: category.id,
      slug: category.slug,
      displayName: category.displayName,
      emoji: category.emoji,
    },
    friendInvitesCreated: inviteeIds.length,
  };
}
