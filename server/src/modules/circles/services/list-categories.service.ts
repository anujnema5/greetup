import { circlesRepository } from "../repositories/circles.repository";

export async function listCircleCategoriesService() {
  return circlesRepository.listActiveCategories();
}
