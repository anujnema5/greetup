/**

 * Spaces feature — API, start-space modal, dashboard grid, and `/spaces` browse.

 *

 * See `README.md` in this folder for the full map.

 */



export {

  StartSpaceModalProvider,

  useStartSpaceModal,

} from "./components/start-space-modal-provider";

export { SpaceOrb } from "./components/space-orb";

export { SpacesGrid } from "./components/spaces-grid";

export { SpacesPage } from "./pages/spaces-page";

export { SPACES_BROWSE_PATH } from "./lib/spaces-browse-path";



export {

  useBrowseActiveSpaces,

  useCreateSpace,

  useDeleteScheduledSpace,

  useListActiveSpaces,

  useListSpaceCategories,

  useUpdateScheduledSpace,

} from "./api";

export type { StartSpaceAdvancedFormState } from "./types/start-space-ui.types";

export type { ActiveSpaceItem, FriendInvitedSpaceItem } from "./types/spaces-api.types";

export {

  getDefaultStartSpaceFormValues,

  startSpaceFormSchema,

} from "./schemas/start-space-form.schema";

export type { StartSpaceFormValues } from "./schemas/start-space-form.schema";

