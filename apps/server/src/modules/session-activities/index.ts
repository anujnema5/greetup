export {
  ACTIVITY_DETAIL_DEFAULT_MAX,
  ACTIVITY_DETAIL_STORAGE_MAX,
  MAX_MATCH_PREP_ACTIVITY_SELECTIONS,
  MAX_SPACE_ACTIVITY_SELECTIONS,
} from "./constants";

export { ActivitySelectionValidationError } from "./activity-selection.errors";
export {
  toActivityOptionDto,
  toActivityOptionDtos,
  toSpaceActivityTagDto,
} from "./activity-catalog.mapper";
export { activityCatalogRepository, activitiesRepository } from "./activity-catalog.repository";
export { normalizeActivityDetail, trimActivityDetail } from "./normalize-detail";

export type {
  ActivityCatalogRow,
  ActivityDetailMode,
  ActivityOptionDto,
  ActivitySelectionContext,
  ActivitySelectionInput,
  SpaceActivityTagDto,
  ValidatedActivitySelection,
} from "./types";
