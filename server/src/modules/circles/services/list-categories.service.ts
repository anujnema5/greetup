import { roomsRepository } from "../repositories/rooms.repository";

export async function listCircleCategoriesService() {
  return roomsRepository.listActiveCategories();
}
