import logger from "@/core/logging";
import { roomCategoriesRepository } from "@/modules/rooms/repositories/room-categories.repository";

export async function listSpaceCategoriesService() {
  const categories = await roomCategoriesRepository.listPickableCategories();
  logger.debug("space_categories_listed", { count: categories.length });
  return categories;
}
