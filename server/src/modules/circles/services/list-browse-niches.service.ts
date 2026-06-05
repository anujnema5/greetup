import logger from "@/core/logging";
import { isRoomCategoryPickable } from "@/modules/rooms/constants/room-category-picker.constants";
import { activeCirclesListingsRepository } from "@/modules/rooms/repositories/active-circles-listings.repository";
import { roomCategoriesRepository } from "@/modules/rooms/repositories/room-categories.repository";

import type { BrowseNicheItem, BrowseNichesResult } from "../types/browse-niches.types";

export async function listBrowseNichesService(): Promise<BrowseNichesResult> {
  const [categories, countRows] = await Promise.all([
    roomCategoriesRepository.listActiveCategories(),
    activeCirclesListingsRepository.countPublicCirclesByCategoryAndStatus(),
  ]);

  const countsByCategoryId = new Map(
    countRows.map((row) => [
      row.categoryId,
      {
        live: row.liveGroupCount,
        scheduled: row.scheduledGroupCount,
      },
    ]),
  );

  const niches: BrowseNicheItem[] = categories
    .filter((c) => isRoomCategoryPickable(c.slug))
    .map((c) => {
      const counts = countsByCategoryId.get(c.id) ?? { live: 0, scheduled: 0 };
      return {
        id: c.id,
        slug: c.slug,
        displayName: c.displayName,
        emoji: c.emoji,
        description: c.description,
        sortOrder: c.sortOrder,
        liveGroupCount: counts.live,
        scheduledGroupCount: counts.scheduled,
      };
    });

  logger.debug("browse_niches_listed", { nicheCount: niches.length });

  return { niches };
}
