/**
 * Circles feature — API, start-circle modal, orb trigger, and dashboard grid.
 *
 * - Validation: `schemas/start-circle-form.schema.ts` (Zod + zodResolver)
 * - UI copy: `constants/start-circle-copy.ts`
 * - Form state: `hooks/use-start-circle-modal-state.ts` (react-hook-form)
 * - Types: `types/` (API DTOs + `start-circle-ui.types.ts`)
 */

export {
  StartCircleModalProvider,
  useStartCircleModal,
} from "./components/start-circle-modal-provider";
export { CircleOrb } from "./components/circle-orb";
export { CirclesGrid } from "./components/circles-grid";

export {
  circlesApi,
  useCreateCircleMutation,
  useDeleteScheduledCircleMutation,
  useListCircleCategoriesQuery,
  useListActiveCirclesQuery,
  useUpdateScheduledCircleMutation,
} from "./api/circles-api";
export type { StartCircleAdvancedFormState } from "./types/start-circle-ui.types";
export type { ActiveCircleItem, FriendInvitedCircleItem } from "./types/circles-api.types";
export {
  getDefaultStartCircleFormValues,
  startCircleFormSchema,
} from "./schemas/start-circle-form.schema";
export type { StartCircleFormValues } from "./schemas/start-circle-form.schema";
