/** In-app room video UI, minimized dock, and sync. Global Redux state: `roomSlice`. */

export * from "./lib/room-sync";
export * from "./lib/room-return-path";
export { useRoomUi, useCallUi } from "./hooks/use-room-ui";
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
  upsertRoomPeer,
  removeRoomPeer,
  setChatDraft,
  setActiveGame,
} from "@/lib/redux/slices/roomSlice";
export { MOCK_MATCH } from "./constants/mock-match";
export { RoomVideoView } from "./components/room-video-view";
export { MinimizedRoomDock } from "./components/minimized-room-dock";
export { RoomMinimizedHydration } from "./components/room-minimized-hydration";
