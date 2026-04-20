import type {
  IceCandidate,
  IceParameters,
  DtlsParameters,
  MediaKind,
  RtpCapabilities,
  RtpParameters,
  SctpParameters,
} from "mediasoup-client/types";
import type { Socket } from "socket.io-client";
import type { RtcSocketState } from "@/features/rtc/hooks/use-rtc-socket";
import type { RtcRoomType } from "@/features/rtc/lib/screen-share-policy";

export type MediasoupRoomStatus =
  | "idle"
  | "connecting_socket"
  | "joining"
  | "negotiating"
  | "ready"
  | "error";

/** Identity and metadata for one remote peer — no stream, just who they are. Extensible for future fields (avatar, role, etc.). */
export type RemotePeer = {
  peerId: string;
  displayName?: string | null;
  /** Optional profile image URL for avatar fallbacks in camera-off states. */
  image?: string | null;
  /** true = camera producer active, false = paused (camera off). undefined = unknown (peer hasn't produced video yet). */
  cameraActive?: boolean;
  /** true = mic producer active, false = paused (muted). undefined = unknown (peer hasn't produced audio yet). */
  micActive?: boolean;
};

/** One remote user’s received tracks joined with their peer metadata. Streams are tracked separately internally. */
export type RemoteParticipant = {
  peer: RemotePeer;
  stream: MediaStream;
};

export type UseMediasoupRoomArgs = {
  enabled: boolean;
  rtcSocket: Socket | null;
  rtcSocketState: RtcSocketState;
  rtcRoomId: string | null;
  /** From RTC JWT — screen-share policy (direct vs circle). */
  rtcRoomType?: RtcRoomType | null;
  /** Current user id — used to filter `remotePeerIds` (room member list from server). */
  localUserId?: string | null;
  /** Current user's display name — sent to peers via the join socket event. */
  localDisplayName?: string | null;
  /** Current user's profile image URL — shared to peers for camera-off avatar fallbacks. */
  localProfileImageUrl?: string | null;
  /** Redux / product: who gets the main remote tile (1:1 match peer, or pinned circle member). */
  preferredRemotePeerId?: string | null;
};

/** Return shape of {@link useMediasoupRoom} — safe to use as a named type in providers/UI. */
export type UseMediasoupRoomReturn = {
  status: MediasoupRoomStatus;
  error: string | null;
  localStream: MediaStream | null;
  /** Main stage in direct rooms: partner screen → your screen → partner camera; includes remote audio. */
  remoteStream: MediaStream | null;
  mainStageShowsScreen: boolean;
  remoteParticipants: RemoteParticipant[];
  /** peerId → RemotePeer — single source of truth for all remote peer identity/metadata. */
  peers: Record<string, RemotePeer>;
  micEnabled: boolean;
  cameraEnabled: boolean;
  toggleMic: () => void;
  toggleCamera: () => void;
  screenSharing: boolean;
  toggleScreenShare: () => void;
  localPreviewStream: MediaStream | null;
  remotePeerCameraStream: MediaStream | null;
  localMediaDeviceError: string | null;
  clearLocalMediaDeviceError: () => void;
};

export type ProducerMediaSource = "camera" | "screen";

export type JoinAck =
  | {
      ok: true;
      rtpCapabilities: RtpCapabilities;
      peerIds: string[];
      /** userId → display name for peers already in the room at join time. */
      peerNames: Record<string, string>;
      /** userId → profile image URL for peers already in the room at join time. */
      peerImages?: Record<string, string>;
      existingProducers: {
        peerId: string;
        producerId: string;
        kind: MediaKind;
        mediaSource?: ProducerMediaSource;
      }[];
    }
  | { ok: false; error?: { code?: string; ownerInstanceId?: string } };

export type TransportCreateAck =
  | {
      ok: true;
      id: string;
      iceParameters: IceParameters;
      iceCandidates: IceCandidate[];
      dtlsParameters: DtlsParameters;
      sctpParameters?: SctpParameters | null;
    }
  | { ok: false; error?: { code?: string } };

export type ProduceAck = { ok: true; id: string } | { ok: false; error?: { code?: string } };

export type ConsumeAck =
  | {
      ok: true;
      id: string;
      producerId: string;
      kind: MediaKind;
      rtpParameters: RtpParameters;
      /** True when the consumer itself is paused (we resume it immediately after consuming). */
      paused: boolean;
      /** True when the remote producer is paused — peer's camera is off. */
      producerPaused: boolean;
    }
  | { ok: false; error?: { code?: string } };

export type SimpleAck = { ok: true } | { ok: false; error?: { code?: string } };
