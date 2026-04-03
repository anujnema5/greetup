import { roomsRepository } from "@/modules/rooms/repositories/rooms.repository";

export async function listCircleCategoriesService() {
  return roomsRepository.listActiveCategories();
}
