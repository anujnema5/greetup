import logger from "@/core/logging";
import { isRoomCategoryPickable } from "@/modules/rooms/constants/room-category-picker.constants";
import { roomCategoriesRepository } from "@/modules/rooms/repositories/room-categories.repository";

export async function listSpaceCategoriesService() {
  const all = await roomCategoriesRepository.listActiveCategories();
  const categories = all.filter((c) => isRoomCategoryPickable(c.slug));
  logger.debug("space_categories_listed", {
    count: categories.length,
    hidden: all.length - categories.length,
  });
  return categories;
}
