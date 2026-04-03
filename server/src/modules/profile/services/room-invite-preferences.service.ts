import { eq, inArray } from "drizzle-orm";
import type { z } from "zod";
import { db } from "@/core/database";
import { userProfiles } from "@/core/database/schema";
import { getAcceptedPeerIdsForUser } from "@/modules/connections/services/accepted-peer-ids.service";

import { roomInviteSettingsBodySchema } from "../schemas/room-invite-preferences.schema";

export type RoomInviteSettingsInput = z.infer<typeof roomInviteSettingsBodySchema>;

export type RoomInvitePolicy = "all_connections" | "selected_only";

export class RoomInviteAllowlistNotConnectionError extends Error {
  constructor() {
    super("You can only choose people you are connected with");
    this.name = "RoomInviteAllowlistNotConnectionError";
  }
}

export async function getRoomInvitePreferencesForUsers(userIds: string[]) {
  if (userIds.length === 0) {
    return new Map<string, { policy: RoomInvitePolicy; allowlistedUserIds: string[] }>();
  }

  const rows = await db.query.userProfiles.findMany({
    where: inArray(userProfiles.userId, userIds),
    columns: {
      userId: true,
      roomInvitePolicy: true,
      roomInviteAllowlistedUserIds: true,
    },
  });

  const map = new Map<string, { policy: RoomInvitePolicy; allowlistedUserIds: string[] }>();
  for (const r of rows) {
    const ids = Array.isArray(r.roomInviteAllowlistedUserIds)
      ? r.roomInviteAllowlistedUserIds.filter((x): x is string => typeof x === "string")
      : [];
    map.set(r.userId, {
      policy: (r.roomInvitePolicy ?? "all_connections") as RoomInvitePolicy,
      allowlistedUserIds: ids,
    });
  }
  for (const id of userIds) {
    if (!map.has(id)) {
      map.set(id, { policy: "all_connections", allowlistedUserIds: [] });
    }
  }
  return map;
}

/** Whether `hostUserId` may add `inviteeUserId` to a room’s friend invites. */
export function canHostInviteUserToRoom(
  hostUserId: string,
  inviteePrefs: { policy: RoomInvitePolicy; allowlistedUserIds: string[] },
): boolean {
  if (inviteePrefs.policy === "all_connections") return true;
  return inviteePrefs.allowlistedUserIds.includes(hostUserId);
}

export async function updateRoomInviteSettingsService(
  userId: string,
  data: RoomInviteSettingsInput,
): Promise<{ policy: RoomInvitePolicy; allowlistedUserIds: string[] }> {
  const { policy, allowlistedUserIds } = data;
  const peers = await getAcceptedPeerIdsForUser(userId);

  const unique = [...new Set(allowlistedUserIds)].filter((id) => id && id !== userId);
  for (const id of unique) {
    if (!peers.has(id)) {
      throw new RoomInviteAllowlistNotConnectionError();
    }
  }

  const storedIds = policy === "selected_only" ? unique : [];

  await db
    .update(userProfiles)
    .set({
      roomInvitePolicy: policy,
      roomInviteAllowlistedUserIds: storedIds,
      updatedAt: new Date(),
    })
    .where(eq(userProfiles.userId, userId));

  return {
    policy,
    allowlistedUserIds: storedIds,
  };
}
