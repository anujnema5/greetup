import logger from "@/core/logging";
import { roomCategoriesRepository } from "@/modules/rooms/repositories/room-categories.repository";

export async function listCircleCategoriesService() {
  const categories = await roomCategoriesRepository.listActiveCategories();
  logger.debug("circle_categories_listed", { count: categories.length });
  return categories;
}
