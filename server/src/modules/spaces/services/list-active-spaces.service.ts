import logger from "@/core/logging";
import { activeSpacesListingsRepository } from "@/modules/rooms/repositories/active-spaces-listings.repository";
import { roomSessionsRepository } from "@/modules/rooms/repositories/room-sessions.repository";
import { deleteSessionRoomRedisMany } from "@/modules/rooms/services/rtc/session-room-redis.service";

import { toActiveSpaceItem } from "../lib/map-active-space-item";
import { roomActivitiesRepository } from "../repositories/room-activities.repository";
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

  const joinedBase: ActiveSpaceItem[] = joinedRows.map(toActiveSpaceItem);
  const joinedIds = new Set(joinedBase.map((c) => c.id));

  const friendInvitedBase: FriendInvitedSpaceItem[] = friendInvitedRows
    .map((row) => ({
      ...toActiveSpaceItem(row),
      inviteStatus: row.inviteStatus as "pending" | "accepted",
    }))
    .filter((c) => !joinedIds.has(c.id));

  const hasMore = publicRows.length > publicLimit;
  const publicItemsBase = (hasMore ? publicRows.slice(0, publicLimit) : publicRows).map(
    toActiveSpaceItem,
  );
  const nextCursor = hasMore ? (publicItemsBase[publicItemsBase.length - 1]?.id ?? null) : null;

  const allRoomIds = [
    ...joinedBase.map((i) => i.id),
    ...friendInvitedBase.map((i) => i.id),
    ...publicItemsBase.map((i) => i.id),
  ];
  const activityRows = await roomActivitiesRepository.listByRoomIds(allRoomIds);
  const activitiesByRoom = roomActivitiesRepository.groupByRoomId(activityRows);

  const withActivities = <T extends ActiveSpaceItem>(item: T): T => ({
    ...item,
    activities: activitiesByRoom.get(item.id) ?? [],
  });

  const joined = joinedBase.map(withActivities);
  const friendInvited = friendInvitedBase.map(withActivities);
  const publicItems = publicItemsBase.map(withActivities);

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
      items: publicItems,
      nextCursor,
      hasMore,
    },
  };
}
