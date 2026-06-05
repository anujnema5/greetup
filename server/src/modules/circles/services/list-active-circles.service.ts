import logger from "@/core/logging";
import { activeCirclesListingsRepository } from "@/modules/rooms/repositories/active-circles-listings.repository";
import { roomSessionsRepository } from "@/modules/rooms/repositories/room-sessions.repository";
import { deleteSessionRoomRedisMany } from "@/modules/rooms/services/rtc/session-room-redis.service";

import { toActiveCircleItem } from "../lib/map-active-circle-item";
import type { ActiveCircleItem, ActiveCirclesResult, FriendInvitedCircleItem } from "../types";

const DEFAULT_PUBLIC_LIMIT = 10;

export async function listActiveCirclesService(
  userId: string,
  publicLimit = DEFAULT_PUBLIC_LIMIT,
  cursor?: string,
): Promise<ActiveCirclesResult> {
  /** Light sync on list — avoid full teardown on every dashboard load (background sweep handles that). */
  const expiredIds = await roomSessionsRepository.syncPastDueCircleRoomExpiry();
  await deleteSessionRoomRedisMany(expiredIds);

  const [friendInvitedRows, joinedRows, publicRows] = await Promise.all([
    activeCirclesListingsRepository.listFriendInvitedCircles(userId),
    activeCirclesListingsRepository.listJoinedCircles(userId),
    activeCirclesListingsRepository.listPublicCircles(userId, publicLimit, cursor),
  ]);

  const joined: ActiveCircleItem[] = joinedRows.map(toActiveCircleItem);
  const joinedIds = new Set(joined.map((c) => c.id));

  const friendInvited: FriendInvitedCircleItem[] = friendInvitedRows
    .map((row) => ({
      ...toActiveCircleItem(row),
      inviteStatus: row.inviteStatus as "pending" | "accepted",
    }))
    .filter((c) => !joinedIds.has(c.id));

  const hasMore = publicRows.length > publicLimit;
  const publicItems = hasMore ? publicRows.slice(0, publicLimit) : publicRows;
  const nextCursor = hasMore ? (publicItems[publicItems.length - 1]?.id ?? null) : null;

  logger.debug("active_circles_listed", {
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
      items: publicItems.map(toActiveCircleItem),
      nextCursor,
      hasMore,
    },
  };
}
