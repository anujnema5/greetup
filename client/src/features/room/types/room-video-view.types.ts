import type {
  MediasoupRoomStatus,
  RemoteParticipant,
  RemotePeer,
} from "@/features/rtc";

export type RoomVideoViewProps = {
  onEnd: () => void;
  onSkip: () => void;
  /** Collapse to floating dock and return to the previous route. */
  onMinimize?: () => void;
  localStream?: MediaStream | null;
  remoteStream?: MediaStream | null;
  /** When true, main stage is a screen share — use contain fit and letterboxing. */
  mainStageShowsScreen?: boolean;
  /** Partner camera — shown in sidebar while `mainStageShowsScreen` so they stay visible. */
  remotePeerCameraStream?: MediaStream | null;
  mediaStatus?: MediasoupRoomStatus;
  mediaError?: string | null;
  peerLabel?: string;
  scoreLabel?: string | null;
  micEnabled?: boolean;
  cameraEnabled?: boolean;
  onToggleMic?: () => void;
  onToggleCamera?: () => void;
  rtcRoomType?: "direct" | "circle" | null;
  screenSharing?: boolean;
  onToggleScreenShare?: () => void;
  /** Camera/mic permission or device error from the last toggle. */
  localMediaDeviceError?: string | null;
  onDismissLocalMediaDeviceError?: () => void;
  /** Current user's display name shown in the local video panel. */
  myName?: string;
  /** True when the primary remote peer has explicitly paused their camera — show initials instead of black screen. */
  remotePeerCameraOff?: boolean;
  /** DB-backed circle / group — grid of remotes; still uses the same mediasoup streams. */
  isGroupRoom?: boolean;
  remoteParticipants?: RemoteParticipant[];
  /** Signaling roster (`peerJoined` / join ack) — merged into the grid so tiles appear before media. */
  remotePeers?: Record<string, RemotePeer>;
  /** When false, hides matchmaking “Skip” (e.g. circles). */
  showSkip?: boolean;
};
