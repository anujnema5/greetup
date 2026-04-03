import { randomBytes } from "node:crypto";

import { mergeCircleAdvancedOptions } from "@/core/database/schema";
import { getAcceptedPeerIdsForUser } from "@/modules/connections/services/accepted-peer-ids.service";

import { circlesRepository } from "../repositories/circles.repository";
import type { CreateCircleBody } from "../schemas/create-circle.schema";

function randomInviteCode(): string {
  return randomBytes(9).toString("base64url").replace(/[^a-zA-Z0-9]/g, "").slice(0, 12);
}

export class CreateCircleError extends Error {
  constructor(
    message: string,
    public readonly code: "CATEGORY_NOT_FOUND" | "INVALID_SCHEDULE" | "INVALID_INVITEES",
  ) {
    super(message);
    this.name = "CreateCircleError";
  }
}

/**
 * Trim, drop host/empty, dedupe order-preserving — avoids duplicate (circle, invitee) rows
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

async function resolveValidatedInviteeIds(
  hostUserId: string,
  invitedUserIds: string[] | undefined,
): Promise<string[]> {
  const unique = normalizeInviteeIds(hostUserId, invitedUserIds);
  if (unique.length === 0) return [];

  const peerIds = await getAcceptedPeerIdsForUser(hostUserId);

  for (const id of unique) {
    if (!peerIds.has(id)) {
      throw new CreateCircleError(
        "You can only invite users you are connected with",
        "INVALID_INVITEES",
      );
    }
  }

  return unique;
}

export async function createCircleService(
  hostUserId: string,
  body: CreateCircleBody,
) {
  const category = await circlesRepository.findActiveCategoryById(body.categoryId);

  if (!category) {
    throw new CreateCircleError("Category not found or inactive", "CATEGORY_NOT_FOUND");
  }

  const now = new Date();
  const advancedOptions = mergeCircleAdvancedOptions(body.advancedOptions);

  const scheduledStartAt =
    body.scheduleMode === "scheduled" && body.scheduledStartAt
      ? new Date(body.scheduledStartAt)
      : null;

  const scheduledEndAt = body.scheduledEndAt
    ? new Date(body.scheduledEndAt)
    : null;

  if (body.scheduleMode === "scheduled" && scheduledStartAt && scheduledStartAt <= now) {
    throw new CreateCircleError(
      "Scheduled start must be in the future",
      "INVALID_SCHEDULE",
    );
  }

  const inviteeIds = await resolveValidatedInviteeIds(
    hostUserId,
    body.invitedUserIds,
  );

  const isInstant = body.scheduleMode === "instant";
  const status = isInstant ? "live" : "scheduled";
  const startedAt = isInstant ? now : null;
  const inviteCode = body.visibility === "private" ? randomInviteCode() : null;

  const row = await circlesRepository.createCircleWithHostAndInvites({
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
  });

  return {
    circle: row,
    category: {
      id: category.id,
      slug: category.slug,
      displayName: category.displayName,
      emoji: category.emoji,
    },
    friendInvitesCreated: inviteeIds.length,
  };
}
