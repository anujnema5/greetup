/**
 * Types passed between {@link useMediasoupRoom} and its sub-hooks (session + local media).
 * Keeps hook files focused on behavior instead of large inline type blocks.
 */

import type { MutableRefObject, SetStateAction } from "react";
import type { Device } from "mediasoup-client";
import type { Producer, Transport } from "mediasoup-client/types";
import type { Socket } from "socket.io-client";
import type { RtcRoomType } from "@/features/rtc/lib/screen-share-policy";
import type {
  MediasoupRoomStatus,
  ProducerMediaSource,
  RemotePeer,
} from "@/features/rtc/types/mediasoup-room.types";
import type { RtcSocketState } from "@/features/rtc/hooks/use-rtc-socket";

/** Refs shared by session setup and local produce toggles. */
export type MediasoupRoomSessionRefs = {
  localStreamRef: MutableRefObject<MediaStream | null>;
  videoProducerRef: MutableRefObject<Producer | null>;
  screenVideoProducerRef: MutableRefObject<Producer | null>;
  screenVideoProducerIdRef: MutableRefObject<string | null>;
  screenAudioProducerRef: MutableRefObject<Producer | null>;
  screenAudioProducerIdRef: MutableRefObject<string | null>;
  localScreenTrackRef: MutableRefObject<MediaStreamTrack | null>;
  audioProducerRef: MutableRefObject<Producer | null>;
  sendTransportRef: MutableRefObject<Transport | null>;
  deviceRef: MutableRefObject<Device | null>;
  socketRef: MutableRefObject<Socket | null>;
  micEnabledRef: MutableRefObject<boolean>;
  cameraEnabledRef: MutableRefObject<boolean>;
  localUserIdRef: MutableRefObject<string | null>;
};

export type MediasoupRoomSessionSetters = {
  setStatus: (s: MediasoupRoomStatus) => void;
  setError: (e: string | null) => void;
  setLocalStream: (s: MediaStream | null) => void;
  setRemoteStreamsByPeerId: (u: SetStateAction<Record<string, MediaStream>>) => void;
  setPeers: (u: SetStateAction<Record<string, RemotePeer>>) => void;
  setMicEnabled: (v: boolean) => void;
  setCameraEnabled: (v: boolean) => void;
  setScreenSharing: (v: boolean) => void;
  setLocalScreenTrackId: (id: string | null) => void;
  setRemoteTrackMediaSource: (u: SetStateAction<Record<string, ProducerMediaSource>>) => void;
  setLocalMediaDeviceError: (msg: string | null) => void;
  setDominantSpeakerPeerId: (u: SetStateAction<string | null>) => void;
};

export type MediasoupRoomSessionOptions = {
  enabled: boolean;
  rtcSocket: Socket | null;
  rtcSocketState: RtcSocketState;
  rtcRoomId: string | null;
  /** Current user's display name — sent to the rtc-service on join so peers can see it. */
  localDisplayName?: string | null;
  /** Current user's profile image URL — sent to rtc-service for peer fallback avatars. */
  localProfileImageUrl?: string | null;
  cleanupLocalScreenShareRef: MutableRefObject<() => void>;
  refs: MediasoupRoomSessionRefs;
  set: MediasoupRoomSessionSetters;
};

export type MediasoupLocalMediaRefs = {
  statusRef: MutableRefObject<MediasoupRoomStatus>;
  sendTransportRef: MutableRefObject<Transport | null>;
  deviceRef: MutableRefObject<Device | null>;
  localStreamRef: MutableRefObject<MediaStream | null>;
  videoProducerRef: MutableRefObject<Producer | null>;
  screenVideoProducerRef: MutableRefObject<Producer | null>;
  screenVideoProducerIdRef: MutableRefObject<string | null>;
  screenAudioProducerRef: MutableRefObject<Producer | null>;
  screenAudioProducerIdRef: MutableRefObject<string | null>;
  localScreenTrackRef: MutableRefObject<MediaStreamTrack | null>;
  audioProducerRef: MutableRefObject<Producer | null>;
  socketRef: MutableRefObject<Socket | null>;
  micEnabledRef: MutableRefObject<boolean>;
  cameraEnabledRef: MutableRefObject<boolean>;
  acquiringMicRef: MutableRefObject<boolean>;
  acquiringCameraRef: MutableRefObject<boolean>;
  acquiringScreenRef: MutableRefObject<boolean>;
  rtcRoomTypeRef: MutableRefObject<RtcRoomType>;
};

export type MediasoupLocalMediaSetters = {
  setLocalStream: (s: MediaStream | null) => void;
  setMicEnabled: (v: boolean) => void;
  setCameraEnabled: (v: boolean) => void;
  setScreenSharing: (v: boolean) => void;
  setLocalScreenTrackId: (id: string | null) => void;
  setLocalMediaDeviceError: (msg: string | null) => void;
};
