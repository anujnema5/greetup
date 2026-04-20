import type {
  MediasoupRoomStatus,
  RemoteParticipant,
  RemotePeer,
} from "@/features/rtc";
import type { RoomActiveActivity } from "@/lib/redux/types/room-slice.types";
import type { RoomSessionType } from "@/shared/types/room-session";

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
  rtcRoomType?: RoomSessionType | null;
  screenSharing?: boolean;
  onToggleScreenShare?: () => void;
  /** Camera/mic permission or device error from the last toggle. */
  localMediaDeviceError?: string | null;
  onDismissLocalMediaDeviceError?: () => void;
  /** Current user's display name shown in the local video panel. */
  myName?: string;
  currentUserId?: string | null;
  /** Current user's profile image URL used in camera-off fallback tiles. */
  myAvatarUrl?: string | null;
  /** Primary remote peer profile image URL used in direct-room camera-off tiles. */
  peerAvatarUrl?: string | null;
  /** True when the primary remote peer has explicitly paused their camera — show initials instead of black screen. */
  remotePeerCameraOff?: boolean;
  /** DB-backed circle / group — grid of remotes; still uses the same mediasoup streams. */
  isGroupRoom?: boolean;
  remoteParticipants?: RemoteParticipant[];
  /** Signaling roster (`peerJoined` / join ack) — merged into the grid so tiles appear before media. */
  remotePeers?: Record<string, RemotePeer>;
  /** When false, hides matchmaking “Skip” (e.g. circles). */
  showSkip?: boolean;
  /** Chat conversation linked to this room — renders in-call chat panel when provided. */
  conversationId?: string | null;
  /** Direct call only: show “Add to circle” in the toolbar. */
  showAddToCircle?: boolean;
  onOpenAddToCircle?: () => void;
  /** Direct call only: remote peer left; show searching state instead of stale remote tile. */
  searchingForNextCandidate?: boolean;
  activeRealtimeActivity?: RoomActiveActivity | null;
  onRequestChessInvite?: () => void;
  requestChessBusy?: boolean;
  onEndActiveGame?: () => void;
};
