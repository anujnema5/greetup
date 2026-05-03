/**
 * Embedded in-call activities (`room_embedded_activities`).
 *
 * - **Catalog hook** → Activities tab tiles + policy lookup for `RoomVideoLayer` / `RoomVideoView`.
 * - **Policy helpers** → People tab, invites, duplicate cameras (pure, testable).
 * - **RTK** → `parse-list-response` + `types` are imported from here by path in `room-api` (avoid cycles).
 */

export type {
  ListRoomEmbeddedActivitiesApiResponse,
  RoomEmbeddedActivityDto,
} from "./types";
export { parseListRoomEmbeddedActivitiesResponse } from "./parse-list-response";
export { shouldShowDirectCallActivitiesTab } from "./direct-call-activities-ui";
export { KNOWN_ACTIVITY_DISPLAY, resolveActivityMetaForStage } from "./known-activity-display";
export {
  DEFAULT_INVITE_BLOCKED_TOAST,
  embeddedCallPolicyActivityIds,
  embeddedCallPolicyLookupFromApiRows,
  resolveEmbeddedActivityCallPolicy,
  shouldSuppressDuplicatePeopleCameras,
  toastMessageForBlockedInvite,
} from "./embedded-activity-call-policy";
export type {
  EmbeddedActivityCallPolicy,
  EmbeddedCallPolicyKey,
  EmbeddedCallPolicyLookup,
  EmbeddedCallPolicyPartial,
} from "./embedded-activity-call-policy";
export { useRoomEmbeddedActivitiesCatalog } from "./use-room-embedded-activities-catalog";
export type { RoomEmbeddedActivitiesCatalog } from "./use-room-embedded-activities-catalog";
