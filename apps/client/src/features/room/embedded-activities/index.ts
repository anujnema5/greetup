/**
 * Embedded in-call activities (`room_embedded_activities`).
 *
 * - **Catalog hook** → Activities tab tiles + policy lookup for `InCallContainer` / `InCallScreen`.
 * - **Policy helpers** → People tab, invites, duplicate cameras (pure, testable).
 * - `parse/parse-list-response` + `types` are imported from here by path in `room.queries` (avoid cycles).
 */

export type {
  ListRoomEmbeddedActivitiesApiResponse,
  RoomEmbeddedActivityDto,
} from "./types";
export { parseListRoomEmbeddedActivitiesResponse } from "./parse/parse-list-response";
export {
  sessionAllowsCallActivities,
  shouldShowDirectCallActivitiesTab,
} from "./catalog/direct-call-activities-ui";
export type { CallActivitiesSessionInput } from "./catalog/direct-call-activities-ui";
export { KNOWN_ACTIVITY_DISPLAY, resolveActivityMetaForStage } from "./catalog/known-activity-display";
export {
  DEFAULT_INVITE_BLOCKED_TOAST,
  embeddedCallPolicyActivityIds,
  embeddedCallPolicyLookupFromApiRows,
  resolveEmbeddedActivityCallPolicy,
  shouldSuppressDuplicatePeopleCameras,
  toastMessageForBlockedInvite,
} from "./policy/embedded-activity-call-policy";
export type {
  EmbeddedActivityCallPolicy,
  EmbeddedCallPolicyKey,
  EmbeddedCallPolicyLookup,
  EmbeddedCallPolicyPartial,
} from "./policy/embedded-activity-call-policy";
export { useRoomEmbeddedActivitiesCatalog } from "./hooks/use-room-embedded-activities-catalog";
export type { RoomEmbeddedActivitiesCatalog } from "./hooks/use-room-embedded-activities-catalog";
