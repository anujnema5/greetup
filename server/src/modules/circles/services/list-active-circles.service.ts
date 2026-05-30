import logger from "@/core/logging";
import { mergeRoomAdvancedOptions } from "@/core/database/schema";
import { activeCirclesListingsRepository } from "@/modules/rooms/repositories/active-circles-listings.repository";
import { roomSessionsRepository } from "@/modules/rooms/repositories/room-sessions.repository";
import { deleteSessionRoomRedisMany } from "@/modules/rooms/services/rtc/session-room-redis.service";
import { ActiveCircleItem, ActiveCirclesResult, FriendInvitedCircleItem } from "../types";

const DEFAULT_PUBLIC_LIMIT = 10;

function normalizePendingInviteeIds(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter((x): x is string => typeof x === "string");
}

function toActiveCircleItem(row: {
  id: string;
  title: string;
  status: "live" | "scheduled" | "ended" | "cancelled";
  visibility: "public" | "private";
  maxParticipants: number;
  description: string | null;
  advancedOptions: unknown;
  pendingInviteeIds: unknown;
  expiresAt: Date | null;
  isExpired: boolean;
  scheduledStartAt: Date | null;
  startedAt: Date | null;
  participantCount: number;
  categoryId: string;
  categorySlug: string;
  categoryDisplayName: string;
  categoryEmoji: string | null;
  hostUserId: string;
  hostName: string;
  hostDisplayName: string | null;
}): ActiveCircleItem {
  return {
    id: row.id,
    title: row.title,
    status: row.status as "live" | "scheduled",
    visibility: row.visibility,
    maxParticipants: row.maxParticipants,
    description: row.description,
    advancedOptions: mergeRoomAdvancedOptions(row.advancedOptions as never),
    pendingInviteeIds: normalizePendingInviteeIds(row.pendingInviteeIds),
    expiresAt: row.expiresAt?.toISOString() ?? null,
    isExpired: row.isExpired,
    scheduledStartAt: row.scheduledStartAt?.toISOString() ?? null,
    startedAt: row.startedAt?.toISOString() ?? null,
    participantCount: row.participantCount,
    category: {
      id: row.categoryId,
      slug: row.categorySlug,
      displayName: row.categoryDisplayName,
      emoji: row.categoryEmoji,
    },
    host: {
      userId: row.hostUserId,
      name: row.hostName,
      displayName: row.hostDisplayName,
    },
  };
}

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
