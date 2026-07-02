export {
  useBrowseActiveSpaces,
  useListActiveSpaces,
  useListSpaceCategories,
  useListSpaceActivityOptions,
} from './spaces.queries';
export type { ListActiveSpacesArgs } from './spaces.queries';
export {
  useCreateSpace,
  useDeleteScheduledSpace,
  useUpdateScheduledSpace,
} from './spaces.mutations';
export type {
  CreateSpaceMutationResult,
  UpdateScheduledSpaceArg,
} from './spaces.mutations';
