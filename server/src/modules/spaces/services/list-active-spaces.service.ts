import logger from "@/core/logging";
import { activeSpacesListingsRepository } from "@/modules/rooms/repositories/active-spaces-listings.repository";
import { roomSessionsRepository } from "@/modules/rooms/repositories/room-sessions.repository";
import { deleteSessionRoomRedisMany } from "@/modules/rooms/services/rtc/session-room-redis.service";

import { toActiveSpaceItem } from "../lib/map-active-space-item";
import type { ActiveSpaceItem, ActiveSpacesResult, FriendInvitedSpaceItem } from "../types";

const DEFAULT_PUBLIC_LIMIT = 10;

export async function listActiveSpacesService(
  userId: string,
  publicLimit = DEFAULT_PUBLIC_LIMIT,
  cursor?: string,
): Promise<ActiveSpacesResult> {
  /** Light sync on list — avoid full teardown on every dashboard load (background sweep handles that). */
  const expiredIds = await roomSessionsRepository.syncPastDueSpaceRoomExpiry();
  await deleteSessionRoomRedisMany(expiredIds);

  const [friendInvitedRows, joinedRows, publicRows] = await Promise.all([
    activeSpacesListingsRepository.listFriendInvitedSpaces(userId),
    activeSpacesListingsRepository.listJoinedSpaces(userId),
    activeSpacesListingsRepository.listPublicSpaces(userId, publicLimit, cursor),
  ]);

  const joined: ActiveSpaceItem[] = joinedRows.map(toActiveSpaceItem);
  const joinedIds = new Set(joined.map((c) => c.id));

  const friendInvited: FriendInvitedSpaceItem[] = friendInvitedRows
    .map((row) => ({
      ...toActiveSpaceItem(row),
      inviteStatus: row.inviteStatus as "pending" | "accepted",
    }))
    .filter((c) => !joinedIds.has(c.id));

  const hasMore = publicRows.length > publicLimit;
  const publicItems = hasMore ? publicRows.slice(0, publicLimit) : publicRows;
  const nextCursor = hasMore ? (publicItems[publicItems.length - 1]?.id ?? null) : null;

  logger.debug("active_spaces_listed", {
    userId,
    expiredSyncedCount: expiredIds.length,
    friendInvitedCount: friendInvited.length,
    joinedCount: joined.length,
    publicCount: publicItems.length,
    hasMore,
  });

  return {
    friendInvited,
    joined,
    public: {
      items: publicItems.map(toActiveSpaceItem),
      nextCursor,
      hasMore,
    },
  };
}
