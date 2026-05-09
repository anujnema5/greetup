/**
 * Video call UI: `/circle/[roomId]`, minimized dock, cross-tab sync.
 *
 * - Constants: `constants/call-flow.ts`, `constants/direct-call-recovery.ts`, `constants/mock-match.ts`
 * - Embedded activities (DB-backed): `embedded-activities/`
 * - Cross-tab single-tab lease: `lib/room-tab-lease.ts`, `hooks/use-room-page-tab-lease.ts`,
 *   `hooks/use-room-tab-lease-rtc-sync.ts`
 * - Partner drop (direct match): `components/direct-call-partner-disconnect-handler.tsx`
 * - Redux: import actions/selectors from here or `@/lib/redux/slices/room-slice`
 */

export * from "./lib/room-sync";
export * from "./lib/room-tab-lease";
export * from "./lib/room-return-path";
export { useRoomUi } from "./hooks/use-room-ui";
export { useRoomVideo } from "./hooks/use-room-video";
export { useMinimizedDockMainStage } from "./hooks/use-minimized-dock-main-stage";
export type { MinimizedDockMainStage } from "./hooks/use-minimized-dock-main-stage";
export { useRoomPageTabLease } from "./hooks/use-room-page-tab-lease";
export type { RoomPageLeaseRouter } from "./hooks/use-room-page-tab-lease";
export { useRoomTabLeaseRtcSync } from "./hooks/use-room-tab-lease-rtc-sync";
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
export { MOCK_MATCH } from "./constants/mock-match";
export { MATCHMAKING_HUB_PATH } from "./constants/call-flow";
export {
  DIRECT_CALL_RECOVERY,
  DIRECT_CALL_PEER_LEFT_DEBOUNCE_MS,
  DIRECT_CALL_NETWORK_RECOVERY_TIMEOUT_MS,
} from "./constants/direct-call-recovery";
export { RoomVideoView } from "./components/room-video-view";
export type { RoomVideoViewProps } from "./types/room-video-view.types";
export type { DirectExpandInvitePayload } from "./types/direct-expand-socket.types";
export { RoomVideoLayer } from "./components/room-video-layer";
export { MinimizedRoomDock } from "./components/minimized-room-dock";
export { RoomMinimizedHydration } from "./components/room-minimized-hydration";
export { DirectCallPartnerDisconnectHandler } from "./components/direct-call-partner-disconnect-handler";
export { RoomDirectExpandSocketBridge } from "./components/room-direct-expand-socket-bridge";
export {
  roomApi,
  leaveRoomKeepalive,
  useLeaveRoomMutation,
  useGetRoomQuery,
  useGetRoomEmbeddedActivitiesQuery,
  useJoinRoomMutation,
  useRoomInviteMutation,
  useRoomInviteRespondMutation,
  useUpdateRoomTitleMutation,
  useExpandDirectInviteMutation,
  useExpandDirectRespondMutation,
} from "./api/room-api";
