/**
 * Circles feature — API, start-circle modal, dashboard grid, and `/circles` browse.
 *
 * See `README.md` in this folder for the full map.
 */

export {
  StartCircleModalProvider,
  useStartCircleModal,
} from "./components/start-circle-modal-provider";
export { CircleOrb } from "./components/circle-orb";
export { CirclesGrid } from "./components/circles-grid";
export { CirclesPage } from "./pages/circles-page";
export { CIRCLES_BROWSE_PATH } from "./lib/circles-browse-path";

export {
  circlesApi,
  useCreateCircleMutation,
  useDeleteScheduledCircleMutation,
  useListCircleCategoriesQuery,
  useListActiveCirclesQuery,
  useBrowseActiveCirclesInfiniteQuery,
  useUpdateScheduledCircleMutation,
} from "./api/circles-api";
export type { StartCircleAdvancedFormState } from "./types/start-circle-ui.types";
export type { ActiveCircleItem, FriendInvitedCircleItem } from "./types/circles-api.types";
export {
  getDefaultStartCircleFormValues,
  startCircleFormSchema,
} from "./schemas/start-circle-form.schema";
export type { StartCircleFormValues } from "./schemas/start-circle-form.schema";
