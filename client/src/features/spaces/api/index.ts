export {
  useBrowseActiveSpaces,
  useListActiveSpaces,
  useListSpaceCategories,
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
