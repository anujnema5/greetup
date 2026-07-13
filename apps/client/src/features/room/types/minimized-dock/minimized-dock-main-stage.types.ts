import type {
  ProducerMediaSource,
  RemoteParticipant,
} from "@/features/rtc/types/mediasoup-room.types";
import type { RoomSessionType } from "@/shared/types/room-session";

/** Right column in {@link MinimizedRoomDock}: local “You” or a remote thumbnail when main is self. */
export type MinimizedDockSideStrip = {
  stream: MediaStream | null;
  videoLive: boolean;
  label: string;
  /** Mirror local camera preview. */
  mirrorVideo: boolean;
  /** Set when the strip shows a remote peer (main stage is local); null for “You”. */
  remotePeer: RemoteParticipant | null;
};

/** Output of {@link useMinimizedDockMainStage} for the minimized call dock. */
export type MinimizedDockMainStage = {
  /** Big preview area — screen-share composite or camera / avatar focus. */
  mainStream: MediaStream | null;
  /** True when a visible video surface should cover the stage (else avatar + optional audio sink). */
  mainVideoLive: boolean;
  /** Mount a hidden sink when true so remote audio still plays (camera off / video muted). */
  mainHasPlayableMedia: boolean;
  /** Local preview on main must stay muted to avoid feedback. */
  mainVideoMuted: boolean;
  mainStageShowsScreen: boolean;
  headerLabel: string;
  stageBadge: "video" | "sharing";
  sideStrip: MinimizedDockSideStrip;
  mainFocusPeerId: string | null;
  mainParticipant: RemoteParticipant | null;
};

/** Inputs for {@link useMinimizedDockMainStage}. */
export type UseMinimizedDockMainStageArgs = {
  mainStageShowsScreen: boolean;
  remoteMediaStream: MediaStream | null;
  remoteParticipants: RemoteParticipant[];
  remoteTrackMediaSource: Record<string, ProducerMediaSource>;
  liveSpeakerPeerId: string | null;
  /** When `circle`, match URL “primary peer” must not pin the dock — follow dominant speaker instead. */
  rtcRoomType: RoomSessionType | null;
  rtcPrimaryRemoteUserId: string | null;
  currentUserId: string | null | undefined;
  localMediaStream: MediaStream | null;
  /** UI + producer state — must be in the memo deps: `localMediaStream` identity does not change when tracks are paused. */
  cameraEnabled: boolean;
  /** 1:1 display name from room store when roster is thin. */
  directCallPeerLabel: string | null;
};
