/**
 * Video call UI: `/circle/[roomId]`, minimized dock, cross-tab sync.
 *
 * - Constants: `constants/call-flow.ts`, `constants/mock-match.ts`
 * - Partner drop (direct match): `components/direct-call-partner-disconnect-handler.tsx`
 * - Redux: import actions/selectors from here or `@/lib/redux/slices/roomSlice`
 */

export * from "./lib/room-sync";
export * from "./lib/room-return-path";
export { useRoomUi } from "./hooks/use-room-ui";
export { useRoomVideo } from "./hooks/use-room-video";
export { RoomPage } from "./pages/room-page";
export type { RoomSliceState } from "@/lib/redux/slices/roomSlice";
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
  setActiveGame,
} from "@/lib/redux/slices/roomSlice";
export { MOCK_MATCH } from "./constants/mock-match";
export { MATCHMAKING_HUB_PATH, DIRECT_CALL_PEER_LEFT_DEBOUNCE_MS } from "./constants/call-flow";
export { RoomVideoView } from "./components/room-video-view";
export type { RoomVideoViewProps } from "./types/room-video-view.types";
export type { DirectExpandInvitePayload } from "./types/direct-expand-socket.types";
export { RoomVideoLayer } from "./components/room-video-layer";
export { MinimizedRoomDock } from "./components/minimized-room-dock";
export { RoomMinimizedHydration } from "./components/room-minimized-hydration";
export { DirectCallPartnerDisconnectHandler } from "./components/direct-call-partner-disconnect-handler";
export { RoomDirectExpandSocketBridge } from "./components/room-direct-expand-socket-bridge";
