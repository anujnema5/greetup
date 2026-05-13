import type {
  MediasoupRoomStatus,
  ProducerMediaSource,
  RemoteParticipant,
  RemotePeer,
  ScreenShareTileInfo,
} from "@/features/rtc";
import type { RoomActiveActivity } from "@/lib/redux/types/room-slice.types";
import type { RoomSessionType } from "@/shared/types/room-session";
import type { EmbeddedCallPolicyLookup } from "@/features/room/embedded-activities";
import type { RoomActivityId, RoomActivityMeta } from "@/features/room/types/room-activity.types";

export type RoomVideoViewProps = {
  onEnd: () => void;
  onSkip: () => void;
  /** Collapse to floating dock and return to the previous route. */
  onMinimize?: () => void;
  localStream?: MediaStream | null;
  /** Full local mediasoup stream (mic+cam+screen); with `localScreenTrackId` builds People-tab self view. */
  localCompositeStream?: MediaStream | null;
  localScreenTrackId?: string | null;
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
  /** True when the primary remote peer has explicitly muted their mic. */
  remotePeerMicOff?: boolean;
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
  /** Direct call only: matchmaking reported no match / error while replacing the peer. */
  directCallMatchSearchFailed?: boolean;
  directCallMatchSearchError?: string | null;
  onRetryDirectCallMatchSearch?: () => void;
  activeRealtimeActivity?: RoomActiveActivity | null;
  onRequestChessInvite?: () => void;
  requestChessBusy?: boolean;
  onEndActiveGame?: () => void;
  onOfferDrawGame?: () => void;
  /** Circle call: room id for host rename API. */
  roomId?: string | null;
  /** Circle display name (DB-backed title or fallback). */
  circleDisplayTitle?: string | null;
  /** True when the signed-in user is the circle host (can rename). */
  circleCanEditTitle?: boolean;
  /** Active screen-share surfaces — filmstrip + main stage when non-empty. */
  screenShareTiles?: ScreenShareTileInfo[];
  focusedScreenShareKey?: string | null;
  onSelectScreenShare?: (key: string) => void;
  remoteTrackMediaSource?: Record<string, ProducerMediaSource>;
  /**
   * Lets `RoomVideoLayer` apply {@link resolveEmbeddedActivityCallPolicy} for invites using the
   * in-view embedded stage id (may be set before Redux sync, e.g. chess invite pending).
   */
  onEmbeddedStageActivityChange?: (stageActivityId: RoomActivityId | null) => void;
  /** Active-only tiles from `GET /room/embedded-activities`; `RoomVideoView` treats missing as `[]`. */
  directRoomActivities?: RoomActivityMeta[];
  /** Full API policy map; merged with chess defaults in `resolveEmbeddedActivityCallPolicy` when thin. */
  embeddedCallPolicyLookup?: EmbeddedCallPolicyLookup | null;
  /** Circle host: explicit “end circle for everyone” (separate from leaving the call yourself). */
  showHostEndCircleForEveryone?: boolean;
  onHostEndCircleForEveryone?: () => void;
  /** Mediasoup dominant speaker user id (`dominantSpeaker` from rtc-service). */
  dominantSpeakerPeerId?: string | null;
};
