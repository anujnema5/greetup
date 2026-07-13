import {
  activityCatalogRepository,
  toActivityOptionDtos,
} from "@/modules/session-activities";

export async function listSpaceActivityOptionsService() {
  const rows = await activityCatalogRepository.listActiveCatalog("space");
  return { activities: toActivityOptionDtos(rows) };
}
