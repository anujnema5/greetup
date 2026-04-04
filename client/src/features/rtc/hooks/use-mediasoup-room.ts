"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Producer, Transport } from "mediasoup-client/types";
import type { Device } from "mediasoup-client";
import type { Socket } from "socket.io-client";
import { useMediasoupLocalMedia } from "@/features/rtc/hooks/use-mediasoup-local-media";
import { useMediasoupRoomSession } from "@/features/rtc/hooks/use-mediasoup-room-session";
import {
  buildDirectCallMainStageStream,
  buildDirectCallRemotePeerCameraStream,
  buildLocalPreviewStream,
  directCallMainStageShowsScreen,
} from "@/features/rtc/lib/direct-call-stage";
import { pickPrimaryRemoteStream, remoteParticipantsFromRecord } from "@/features/rtc/lib/remote-participant-streams";
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
  const { rtcSocket, rtcSocketState, rtcRoomId, rtcRoomType, localUserId, localDisplayName, preferredRemotePeerId } =
    options;

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
  const [localMediaDeviceError, setLocalMediaDeviceError] = useState<string | null>(null);

  const localStreamRef = useRef<MediaStream | null>(null);
  const videoProducerRef = useRef<Producer | null>(null);
  const screenProducerRef = useRef<Producer | null>(null);
  const screenShareProducerIdRef = useRef<string | null>(null);
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
  statusRef.current = status;

  // Async handlers read latest values via refs (avoids stale closures).
  useEffect(() => {
    localUserIdRef.current = localUserId ?? null;
    rtcRoomTypeRef.current = rtcRoomType ?? "direct";
    localStreamRef.current = localStream;
    micEnabledRef.current = micEnabled;
    cameraEnabledRef.current = cameraEnabled;
  }, [localUserId, rtcRoomType, localStream, micEnabled, cameraEnabled]);

  const remoteParticipants = useMemo(
    () => remoteParticipantsFromRecord(remoteStreamsByPeerId, peers),
    [remoteStreamsByPeerId, peers],
  );

  const primaryRemoteStream = useMemo(
    () => pickPrimaryRemoteStream(remoteParticipants, preferredRemotePeerId ?? null),
    [remoteParticipants, preferredRemotePeerId],
  );

  const remoteStream = useMemo(
    () =>
      buildDirectCallMainStageStream({
        rtcRoomType,
        primaryRemoteStream,
        remoteTrackMediaSource,
        screenSharing,
        localStream,
        localScreenTrackId,
      }),
    [rtcRoomType, primaryRemoteStream, remoteTrackMediaSource, screenSharing, localStream, localScreenTrackId],
  );

  const mainStageShowsScreen = useMemo(
    () =>
      directCallMainStageShowsScreen({
        rtcRoomType,
        screenSharing,
        primaryRemoteStream,
        remoteTrackMediaSource,
      }),
    [rtcRoomType, screenSharing, primaryRemoteStream, remoteTrackMediaSource],
  );

  const remotePeerCameraStream = useMemo(
    () =>
      buildDirectCallRemotePeerCameraStream({
        rtcRoomType,
        primaryRemoteStream,
        remoteTrackMediaSource,
      }),
    [rtcRoomType, primaryRemoteStream, remoteTrackMediaSource],
  );

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
      screenProducerRef,
      screenShareProducerIdRef,
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

  const { toggleMic, toggleCamera, toggleScreenShare, cleanupLocalScreenShare } = useMediasoupLocalMedia(
    localMediaRefs,
    localMediaSetters,
  );

  const cleanupLocalScreenShareRef = useRef(cleanupLocalScreenShare);
  cleanupLocalScreenShareRef.current = cleanupLocalScreenShare;

  const sessionRefs = useMemo<MediasoupRoomSessionRefs>(
    () => ({
      localStreamRef,
      videoProducerRef,
      screenProducerRef,
      screenShareProducerIdRef,
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
    ],
  );

  useMediasoupRoomSession({
    enabled: options.enabled,
    rtcSocket,
    rtcSocketState,
    rtcRoomId,
    localDisplayName,
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
    remotePeerCameraStream,
    localMediaDeviceError,
    clearLocalMediaDeviceError,
    toggleMic,
    toggleCamera,
  };
}
