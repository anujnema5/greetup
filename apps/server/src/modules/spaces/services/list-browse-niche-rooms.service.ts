import logger from "@/core/logging";
import { isRoomCategoryPickable } from "@/modules/rooms/constants/room-category-picker.constants";
import { activeSpacesListingsRepository } from "@/modules/rooms/repositories/active-spaces-listings.repository";
import { roomCategoriesRepository } from "@/modules/rooms/repositories/room-categories.repository";
import { roomSessionsRepository } from "@/modules/rooms/repositories/room-sessions.repository";
import { deleteSessionRoomRedisMany } from "@/modules/rooms/services/rtc/session-room-redis.service";
import { countRtcPeersForRooms } from "@/modules/rooms/services/rtc/user-active-rtc-room-redis.service";

import { toActiveSpaceItem } from "../lib/map-active-space-item";
import type { BrowseNicheRoomsResult } from "../types/browse-niches.types";

export class BrowseNicheRoomsError extends Error {
  constructor(
    message: string,
    public readonly code: "CATEGORY_NOT_FOUND",
    public readonly statusCode: 404,
  ) {
    super(message);
    this.name = "BrowseNicheRoomsError";
  }
}

const DEFAULT_LIMIT = 20;

export async function listBrowseNicheRoomsService(
  userId: string,
  categoryId: string,
  limit = DEFAULT_LIMIT,
  cursor?: string,
): Promise<BrowseNicheRoomsResult> {
  const category = await roomCategoriesRepository.findActiveCategoryById(categoryId);
  if (!category || !isRoomCategoryPickable(category.slug)) {
    throw new BrowseNicheRoomsError("Category not found", "CATEGORY_NOT_FOUND", 404);
  }

  const safeLimit = Math.min(50, Math.max(1, limit));

  const expiredIds = await roomSessionsRepository.syncPastDueSpaceRoomExpiry();
  await deleteSessionRoomRedisMany(expiredIds);

  const rows = await activeSpacesListingsRepository.listPublicSpacesInCategory(
    userId,
    categoryId,
    safeLimit,
    cursor,
  );

  const hasMore = rows.length > safeLimit;
  const pageRows = hasMore ? rows.slice(0, safeLimit) : rows;
  const nextCursor = hasMore ? (pageRows[pageRows.length - 1]?.id ?? null) : null;

  logger.debug("browse_niche_rooms_listed", {
    userId,
    categoryId,
    resultCount: pageRows.length,
    hasMore,
  });

  const items = pageRows.map(toActiveSpaceItem);
  const inRoomByRoomId = await countRtcPeersForRooms(items.map((c) => c.id));
  for (const item of items) {
    item.participantCount = inRoomByRoomId.get(item.id) ?? 0;
  }

  return {
    items,
    nextCursor,
    hasMore,
  };
}
