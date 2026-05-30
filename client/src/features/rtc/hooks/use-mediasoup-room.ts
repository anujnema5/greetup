"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import type { Producer, Transport } from "mediasoup-client/types";
import type { Device } from "mediasoup-client";
import type { Socket } from "socket.io-client";
import { useMediasoupLocalMedia } from "@/features/rtc/hooks/use-mediasoup-local-media";
import { useMediasoupRoomSession } from "@/features/rtc/hooks/use-mediasoup-room-session";
import { useApplyLobbyMediaIntent } from "@/features/room/hooks/lobby/use-apply-lobby-media-intent";
import { clearLobbyMediaHandoff, clearLobbyMediaIntent } from "@/features/room/lib/lobby";
import { useScreenShareFocusOrdering } from "@/features/rtc/hooks/use-screen-share-focus-ordering";
import {
  buildDirectCallMainStageStream,
  buildDirectCallRemotePeerCameraStream,
  buildLocalPreviewStream,
  directCallMainStageShowsScreen,
} from "@/features/rtc/lib/direct-call-stage";
import {
  buildDirectPeerCameraInsetForScreenFocus,
  buildMainStageStreamForScreenFocus,
  collectScreenShareTiles,
  mainStageIsScreenShareVideo,
} from "@/features/rtc/lib/screen-share-stage";
import {
  pickPrimaryRemoteStream,
  remoteParticipantsFromRecord,
} from "@/features/rtc/lib/remote-participant-streams";
import { MAX_CONCURRENT_SCREEN_SHARES } from "@/features/rtc/lib/screen-share-policy";
import type { RtcRoomType } from "@/features/rtc/lib/screen-share-policy";
import type {
  MediasoupLocalMediaRefs,
  MediasoupRoomSessionRefs,
  MediasoupRoomSessionSetters,
} from "@/features/rtc/types/mediasoup-hooks.types";
import type {
  MediasoupRoomStatus,
  ProducerMediaSource,
  RemotePeer,
  UseMediasoupRoomArgs,
  UseMediasoupRoomReturn,
} from "@/features/rtc/types/mediasoup-room.types";

/**
 * Composes mediasoup signaling ({@link useMediasoupRoomSession}) with local media toggles
 * ({@link useMediasoupLocalMedia}) and direct-call display math ({@link buildDirectCallMainStageStream}).
 */
export function useMediasoupRoom(options: UseMediasoupRoomArgs): UseMediasoupRoomReturn {
  const {
    rtcSocket,
    rtcSocketState,
    rtcRoomId,
    rtcRoomType,
    localUserId,
    localDisplayName,
    localProfileImageUrl,
    preferredRemotePeerId,
  } = options;

  const [status, setStatus] = useState<MediasoupRoomStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStreamsByPeerId, setRemoteStreamsByPeerId] = useState<Record<string, MediaStream>>({});
  const [peers, setPeers] = useState<Record<string, RemotePeer>>({});
  const [micEnabled, setMicEnabled] = useState(false);
  const [cameraEnabled, setCameraEnabled] = useState(false);
  const [screenSharing, setScreenSharing] = useState(false);
  const [localScreenTrackId, setLocalScreenTrackId] = useState<string | null>(null);
  const [remoteTrackMediaSource, setRemoteTrackMediaSource] = useState<
    Record<string, ProducerMediaSource>
  >({});
  const [dominantSpeakerPeerId, setDominantSpeakerPeerId] = useState<string | null>(null);
  const [dominantSpeakerSpeakingMs, setDominantSpeakerSpeakingMs] = useState<Record<string, number>>(
    {},
  );
  const [localMediaDeviceError, setLocalMediaDeviceError] = useState<string | null>(null);

  const localStreamRef = useRef<MediaStream | null>(null);
  const videoProducerRef = useRef<Producer | null>(null);
  const screenVideoProducerRef = useRef<Producer | null>(null);
  const screenVideoProducerIdRef = useRef<string | null>(null);
  const screenAudioProducerRef = useRef<Producer | null>(null);
  const screenAudioProducerIdRef = useRef<string | null>(null);
  const localScreenTrackRef = useRef<MediaStreamTrack | null>(null);
  const audioProducerRef = useRef<Producer | null>(null);
  const sendTransportRef = useRef<Transport | null>(null);
  const deviceRef = useRef<Device | null>(null);
  const socketRef = useRef<Socket | null>(null);
  const micEnabledRef = useRef(false);
  const cameraEnabledRef = useRef(false);
  const acquiringMicRef = useRef(false);
  const acquiringCameraRef = useRef(false);
  const acquiringScreenRef = useRef(false);
  const localUserIdRef = useRef<string | null>(localUserId ?? null);
  const rtcRoomTypeRef = useRef<RtcRoomType>(rtcRoomType ?? "direct");
  const statusRef = useRef(status);
  const localDisplayNameRef = useRef(localDisplayName);
  const localProfileImageUrlRef = useRef(localProfileImageUrl);

  // Async handlers read latest values via refs (avoids stale closures).
  useEffect(() => {
    localUserIdRef.current = localUserId ?? null;
    rtcRoomTypeRef.current = rtcRoomType ?? "direct";
    statusRef.current = status;
    localStreamRef.current = localStream;
    micEnabledRef.current = micEnabled;
    cameraEnabledRef.current = cameraEnabled;
  }, [localUserId, rtcRoomType, status, localStream, micEnabled, cameraEnabled]);

  useEffect(() => {
    localDisplayNameRef.current = localDisplayName;
    localProfileImageUrlRef.current = localProfileImageUrl;
  }, [localDisplayName, localProfileImageUrl]);

  const remoteParticipants = useMemo(
    () => remoteParticipantsFromRecord(remoteStreamsByPeerId, peers),
    [remoteStreamsByPeerId, peers],
  );

  const primaryRemoteStream = useMemo(
    () => pickPrimaryRemoteStream(remoteParticipants, preferredRemotePeerId ?? null),
    [remoteParticipants, preferredRemotePeerId],
  );

  const localUserLabel = localDisplayName?.trim() || "You";

  const screenShareTiles = useMemo(
    () =>
      collectScreenShareTiles({
        localUserLabel,
        screenSharing,
        localStream,
        localScreenTrackId,
        remoteStreamsByPeerId,
        remoteTrackMediaSource,
        peers,
      }),
    [
      localUserLabel,
      screenSharing,
      localStream,
      localScreenTrackId,
      remoteStreamsByPeerId,
      remoteTrackMediaSource,
      peers,
    ],
  );

  const {
    focusedScreenShareKey: effectiveScreenShareKey,
    setFocusedScreenShareKey,
  } = useScreenShareFocusOrdering(screenShareTiles);

  const remoteStream = useMemo(() => {
    if (screenShareTiles.length > 0 && effectiveScreenShareKey) {
      return buildMainStageStreamForScreenFocus({
        focusKey: effectiveScreenShareKey,
        tiles: screenShareTiles,
        audioSourceStream: primaryRemoteStream,
      });
    }
    return buildDirectCallMainStageStream({
      rtcRoomType,
      primaryRemoteStream,
      remoteTrackMediaSource,
      screenSharing,
      localStream,
      localScreenTrackId,
    });
  }, [
    screenShareTiles,
    effectiveScreenShareKey,
    primaryRemoteStream,
    rtcRoomType,
    remoteTrackMediaSource,
    screenSharing,
    localStream,
    localScreenTrackId,
  ]);

  const mainStageShowsScreen = useMemo(() => {
    if (screenShareTiles.length > 0 && effectiveScreenShareKey) {
      return mainStageIsScreenShareVideo(effectiveScreenShareKey, screenShareTiles);
    }
    return directCallMainStageShowsScreen({
      rtcRoomType,
      screenSharing,
      primaryRemoteStream,
      remoteTrackMediaSource,
    });
  }, [
    screenShareTiles,
    effectiveScreenShareKey,
    rtcRoomType,
    screenSharing,
    primaryRemoteStream,
    remoteTrackMediaSource,
  ]);

  const remotePeerCameraStream = useMemo(() => {
    if (screenShareTiles.length > 0 && effectiveScreenShareKey) {
      return buildDirectPeerCameraInsetForScreenFocus({
        focusedShareKey: effectiveScreenShareKey,
        primaryRemoteStream,
        remoteStreamsByPeerId,
        remoteTrackMediaSource,
        screenShareTiles,
      });
    }
    return buildDirectCallRemotePeerCameraStream({
      rtcRoomType,
      primaryRemoteStream,
      remoteTrackMediaSource,
    });
  }, [
    screenShareTiles,
    effectiveScreenShareKey,
    primaryRemoteStream,
    remoteStreamsByPeerId,
    remoteTrackMediaSource,
    rtcRoomType,
  ]);

  const localPreviewStream = useMemo(
    () => buildLocalPreviewStream(localStream, localScreenTrackId),
    [localStream, localScreenTrackId],
  );

  const clearLocalMediaDeviceError = useCallback(() => {
    setLocalMediaDeviceError(null);
  }, []);

  const localMediaRefs = useMemo<MediasoupLocalMediaRefs>(
    () => ({
      statusRef,
      sendTransportRef,
      deviceRef,
      localStreamRef,
      videoProducerRef,
      screenVideoProducerRef,
      screenVideoProducerIdRef,
      screenAudioProducerRef,
      screenAudioProducerIdRef,
      localScreenTrackRef,
      audioProducerRef,
      socketRef,
      micEnabledRef,
      cameraEnabledRef,
      acquiringMicRef,
      acquiringCameraRef,
      acquiringScreenRef,
      rtcRoomTypeRef,
    }),
    [],
  );

  const localMediaSetters = useMemo(
    () => ({
      setLocalStream,
      setMicEnabled,
      setCameraEnabled,
      setScreenSharing,
      setLocalScreenTrackId,
      setLocalMediaDeviceError,
    }),
    [
      setLocalStream,
      setMicEnabled,
      setCameraEnabled,
      setScreenSharing,
      setLocalScreenTrackId,
      setLocalMediaDeviceError,
    ],
  );

  const {
    toggleMic,
    toggleCamera,
    toggleScreenShare: toggleScreenShareInternal,
    cleanupLocalScreenShare,
  } = useMediasoupLocalMedia(localMediaRefs, localMediaSetters);

  useApplyLobbyMediaIntent({
    mediasoupReady: status === "ready",
    micEnabled,
    cameraEnabled,
    toggleMic,
    toggleCamera,
  });

  useEffect(() => {
    if (options.enabled) return;
    clearLobbyMediaIntent();
    clearLobbyMediaHandoff();
  }, [options.enabled]);

  const toggleScreenShare = useCallback(() => {
    if (!screenSharing && screenShareTiles.length >= MAX_CONCURRENT_SCREEN_SHARES) {
      toast.error(`Can't share ${MAX_CONCURRENT_SCREEN_SHARES} screens are already being shared.`);
      return;
    }
    toggleScreenShareInternal();
  }, [screenSharing, screenShareTiles, toggleScreenShareInternal]);

  const cleanupLocalScreenShareRef = useRef(cleanupLocalScreenShare);
  useEffect(() => {
    cleanupLocalScreenShareRef.current = cleanupLocalScreenShare;
  }, [cleanupLocalScreenShare]);

  const sessionRefs = useMemo<MediasoupRoomSessionRefs>(
    () => ({
      localStreamRef,
      videoProducerRef,
      screenVideoProducerRef,
      screenVideoProducerIdRef,
      screenAudioProducerRef,
      screenAudioProducerIdRef,
      localScreenTrackRef,
      audioProducerRef,
      sendTransportRef,
      deviceRef,
      socketRef,
      micEnabledRef,
      cameraEnabledRef,
      localUserIdRef,
    }),
    [],
  );

  const sessionSet = useMemo<MediasoupRoomSessionSetters>(
    () => ({
      setStatus,
      setError,
      setLocalStream,
      setRemoteStreamsByPeerId,
      setPeers,
      setMicEnabled,
      setCameraEnabled,
      setScreenSharing,
      setLocalScreenTrackId,
      setRemoteTrackMediaSource,
      setLocalMediaDeviceError,
      setDominantSpeakerPeerId,
      setDominantSpeakerSpeakingMs,
    }),
    [
      setStatus,
      setError,
      setLocalStream,
      setRemoteStreamsByPeerId,
      setPeers,
      setMicEnabled,
      setCameraEnabled,
      setScreenSharing,
      setLocalScreenTrackId,
      setRemoteTrackMediaSource,
      setLocalMediaDeviceError,
      setDominantSpeakerPeerId,
      setDominantSpeakerSpeakingMs,
    ],
  );

  useMediasoupRoomSession({
    enabled: options.enabled,
    rtcSocket,
    rtcSocketState,
    rtcRoomId,
    localDisplayNameRef,
    localProfileImageUrlRef,
    cleanupLocalScreenShareRef,
    refs: sessionRefs,
    set: sessionSet,
  });

  return {
    status,
    error,
    localStream,
    remoteStream,
    mainStageShowsScreen,
    remoteParticipants,
    peers,
    micEnabled,
    cameraEnabled,
    screenSharing,
    toggleScreenShare,
    localPreviewStream,
    localScreenTrackId,
    remotePeerCameraStream,
    localMediaDeviceError,
    clearLocalMediaDeviceError,
    toggleMic,
    toggleCamera,
    screenShareTiles,
    focusedScreenShareKey: effectiveScreenShareKey,
    setFocusedScreenShareKey,
    remoteTrackMediaSource,
    dominantSpeakerPeerId,
    dominantSpeakerSpeakingMs,
  };
}
