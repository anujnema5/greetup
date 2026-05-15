/**
 * Video call UI: `/circle/[roomId]`, minimized dock, cross-tab sync.
 *
 * Structure: see `README.md` — `call/`, `contracts/`, `listeners/`, `embedded-activities/`.
 * Client hooks: import from `@/features/room/hooks` (not this barrel — keeps RSC layout safe).
 */

export * from "./contracts";
export * from "./lib";
export type {
  MinimizedDockMainStage,
  MinimizedDockSideStrip,
  UseMinimizedDockMainStageArgs,
} from "./types/minimized-dock/minimized-dock-main-stage.types";
export { RoomPage } from "./pages/room-page";
export type { RoomSliceState } from "@/lib/redux/slices/room-slice";
export {
  enterRoomPage,
  resetRoomState,
  resetVideoUi,
  startVideoSession,
  endVideoSession,
  minimizeVideoSession,
  expandVideoSession,
  setRoomPhase,
  setMediaStatus,
  setRtcPrimaryRemoteUserId,
  upsertRoomPeer,
  removeRoomPeer,
  setChatDraft,
} from "@/lib/redux/slices/room-slice";
export {
  setActiveActivity,
  setLastChessOutcome,
  clearLastChessOutcome,
} from "@/lib/redux/slices/room-activity-slice";
export * from "./embedded-activities";
export {
  MOCK_MATCH,
  MATCHMAKING_HUB_PATH,
  CIRCLE_HOST_END_FOR_EVERYONE_REDIRECT_PATH,
  DIRECT_CALL_RECOVERY,
  DIRECT_CALL_PEER_LEFT_DEBOUNCE_MS,
  DIRECT_CALL_NETWORK_RECOVERY_TIMEOUT_MS,
} from "./constants";

export { InCallScreen, InCallContainer, MainStage } from "./call";
export type { InCallScreenProps, DirectExpandInvitePayload } from "./types";
export type { InCallContainerProps } from "./call";
export { MinimizedRoomDock } from "./components/minimized-dock/minimized-room-dock";
export { RoomMinimizedHydration } from "./components/minimized-dock/room-minimized-hydration";
export { OnPartnerDisconnected, OnDirectExpandedToCircle, OnHostEndedCircle } from "./listeners";
export {
  roomApi,
  leaveRoomKeepalive,
  useLeaveRoomMutation,
  useGetRoomQuery,
  useGetRoomEmbeddedActivitiesQuery,
  useJoinRoomMutation,
  useStartScheduledCircleMutation,
  useOpenCircleMeetingMutation,
  useLeaveCircleRtcMutation,
  useHostEndCircleForEveryoneMutation,
  useRoomInviteMutation,
  useRoomInviteRespondMutation,
  useUpdateRoomTitleMutation,
} from "./api/room-api";
