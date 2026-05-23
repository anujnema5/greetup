import { roomCategoriesRepository } from "@/modules/rooms/repositories/room-categories.repository";

export async function listCircleCategoriesService() {
  return roomCategoriesRepository.listActiveCategories();
}
