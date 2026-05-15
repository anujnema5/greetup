"use client";

export { useRoomVideo } from "./session/use-room-video";
export type { UseRoomVideoOptions } from "./session/use-room-video";
export { useRoomJoinAndStartVideo } from "./session/use-room-join-and-start-video";
export { useRoomUi } from "./session/use-room-ui";

export { useRoomPageTabLease } from "./tab-lease/use-room-page-tab-lease";
export type { RoomPageLeaseRouter } from "./tab-lease/use-room-page-tab-lease";
export { useRoomTabLeaseRtcSync } from "./tab-lease/use-room-tab-lease-rtc-sync";

export {
  useAttachMediaStream,
  useRerenderOnVideoTrackMuteCycle,
} from "./media/use-attach-media-stream";
export { useAudioLevel } from "./media/use-audio-level";
export { useCallDisplayData } from "./media/use-call-display-data";
export { useRemoteParticipantLabel } from "./media/use-remote-participant-label";
export { useCallElapsedSeconds } from "./media/use-call-elapsed-seconds";

export { useStageFullscreen } from "./call-ui/use-stage-fullscreen";
export { useRoomRightPanelTab } from "./call-ui/use-room-right-panel-tab";
export {
  useRoomMobileChatSheetHeight,
  roomMobileChatSheetLayoutCssVars,
  ROOM_MOBILE_CHAT_SHEET_HEIGHT_KEY,
  ROOM_MOBILE_CHAT_SHEET_CSS,
} from "./call-ui/use-room-mobile-chat-sheet-height";
export type { UseRoomMobileChatSheetHeightResult } from "./call-ui/use-room-mobile-chat-sheet-height";

export { useNarrowToolbar } from "./toolbar/use-narrow-toolbar";
export { useRoomVideoToolbarInlineCount } from "./toolbar/use-room-video-toolbar-inline-count";
export {
  useRoomVideoToolbarSecondaries,
  type RoomVideoToolbarSecondaryId,
} from "./toolbar/use-room-video-toolbar-secondaries";

export { useMinimizedDockMainStage } from "./minimized-dock/use-minimized-dock-main-stage";
export {
  useMinimizedDockDrag,
  MINIMIZED_DOCK_OFFSET_STORAGE_KEY,
} from "./minimized-dock/use-minimized-dock-drag";

export { useLobbyPreviewMedia } from "./lobby/use-lobby-preview-media";
