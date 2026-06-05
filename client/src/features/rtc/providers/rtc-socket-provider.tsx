"use client";

import { createContext, useContext, useEffect, useMemo } from "react";
import { useSession } from "@/lib/auth-client";
import { useMyProfile } from "@/features/profile-setup/api";
import { useRoomTabLeaseRtcSync } from "@/features/room/hooks";
import {
  selectActiveRoomId,
  selectIsVideoSessionActive,
  selectRtcPrimaryRemoteUserId,
  useRoomStore,
} from "@/features/room/state/room.store";
import { deriveRoomRtcState } from "@/features/rtc/lib/derive-room-rtc-state";
import { useRtcToken } from "../api/rtc.queries";
import { useRtcSocket } from "../hooks/use-rtc-socket";
import { useMediasoupRoom } from "../hooks/use-mediasoup-room";
import type {
  MediasoupRoomStatus,
  ProducerMediaSource,
  RemoteParticipant,
  RemotePeer,
  ScreenShareTileInfo,
} from "../types/mediasoup-room.types";
import type { RoomRtcState } from "../types/rtc-api.types";
import type { UseRtcSocketReturn } from "../hooks/use-rtc-socket";
import type { RoomSessionType } from "@/shared/types/room-session";

export type RtcSocketContextValue = RoomRtcState &
  UseRtcSocketReturn & {
    rtcRoomId: string | null;
    /** Chat conversation auto-created for this room (null until token query resolves). */
    roomConversationId: string | null;
    mediasoupStatus: MediasoupRoomStatus;
    mediasoupError: string | null;
    localMediaStream: MediaStream | null;
    localCompositeStream: MediaStream | null;
    localScreenTrackId: string | null;
    remoteMediaStream: MediaStream | null;
    mainStageShowsScreen: boolean;
    remotePeerCameraStream: MediaStream | null;
    remoteParticipants: RemoteParticipant[];
    peers: Record<string, RemotePeer>;
    micEnabled: boolean;
    cameraEnabled: boolean;
    screenSharing: boolean;
    toggleMic: () => void;
    toggleCamera: () => void;
    toggleScreenShare: () => void;
    rtcRoomType: RoomSessionType | null;
    localMediaDeviceError: string | null;
    clearLocalMediaDeviceError: () => void;
    screenShareTiles: ScreenShareTileInfo[];
    focusedScreenShareKey: string | null;
    setFocusedScreenShareKey: (key: string | null) => void;
    remoteTrackMediaSource: Record<string, ProducerMediaSource>;
    dominantSpeakerPeerId: string | null;
    dominantSpeakerSpeakingMs: Record<string, number>;
  };

const RtcSocketContext = createContext<RtcSocketContextValue | null>(null);

function mapMediasoupToSliceStatus(
  sessionActive: boolean,
  ms: MediasoupRoomStatus,
): "idle" | "connecting" | "connected" | "error" {
  if (!sessionActive) return "idle";
  switch (ms) {
    case "ready":
      return "connected";
    case "error":
      return "error";
    case "joining":
    case "negotiating":
    case "connecting_socket":
      return "connecting";
    default:
      return "idle";
  }
}

/**
 * Owns rtc-service Socket.IO + mediasoup session for the active call.
 * Mediasoup stays mounted while `sessionActive` so minimized dock keeps the same streams.
 */
export function RtcSocketProvider({ children }: { children: React.ReactNode }) {
  const activeRoomId = useRoomStore(selectActiveRoomId);
  const sessionActive = useRoomStore(selectIsVideoSessionActive);
  const rtcPrimaryRemoteUserId = useRoomStore(selectRtcPrimaryRemoteUserId);
  const setMediaStatus = useRoomStore((s) => s.setMediaStatus);
  const { data: session, isPending: sessionPending } = useSession();
  const { data: myProfileData } = useMyProfile({ enabled: !sessionPending });
  const sessionUser = session?.user as
    | { id?: string | null; displayName?: string | null; name?: string | null; image?: string | null }
    | undefined;
  const profileDisplayName = myProfileData?.displayName ?? null;

  const skipRtcToken = !activeRoomId || sessionPending || !sessionUser?.id;

  const rtcQuery = useRtcToken(activeRoomId ?? "", {
    enabled: !skipRtcToken,
  });

  const rtc = deriveRoomRtcState(skipRtcToken, rtcQuery);
  const { rtcSocket, rtcSocketState } = useRtcSocket(rtc.rtcToken ?? null);

  const mediasoupEnabled =
    sessionActive &&
    Boolean(activeRoomId) &&
    rtcSocketState === "connected";

  const rtcRoomType = rtcQuery.data?.roomType ?? null;
  const roomConversationId = rtcQuery.data?.conversationId ?? null;

  const mediasoup = useMediasoupRoom({
    enabled: mediasoupEnabled,
    rtcSocket,
    rtcSocketState,
    rtcRoomId: activeRoomId,
    rtcRoomType,
    localUserId: sessionUser?.id ?? null,
    localDisplayName: profileDisplayName ?? sessionUser?.displayName ?? sessionUser?.name ?? null,
    localProfileImageUrl: sessionUser?.image ?? null,
    preferredRemotePeerId: rtcPrimaryRemoteUserId,
  });

  useEffect(() => {
    setMediaStatus(mapMediasoupToSliceStatus(sessionActive, mediasoup.status));
  }, [setMediaStatus, sessionActive, mediasoup.status]);

  useRoomTabLeaseRtcSync({
    activeRoomId,
    sessionUserId: sessionUser?.id,
    sessionActive,
  });

  const value = useMemo<RtcSocketContextValue>(
    () => ({
      rtcToken: rtc.rtcToken,
      rtcTokenExpiresInSec: rtc.rtcTokenExpiresInSec,
      rtcTokenLoading: rtc.rtcTokenLoading,
      rtcTokenError: rtc.rtcTokenError,
      rtcTokenErrorCode: rtc.rtcTokenErrorCode,
      rtcTokenSkipped: rtc.rtcTokenSkipped,
      refetchRtcToken: rtc.refetchRtcToken,
      rtcSocket,
      rtcSocketState,
      rtcRoomId: activeRoomId,
      roomConversationId,
      rtcRoomType,
      mediasoupStatus: mediasoup.status,
      mediasoupError: mediasoup.error,
    localMediaStream: mediasoup.localPreviewStream,
    localCompositeStream: mediasoup.localStream,
    localScreenTrackId: mediasoup.localScreenTrackId,
    remoteMediaStream: mediasoup.remoteStream,
      mainStageShowsScreen: mediasoup.mainStageShowsScreen,
      remotePeerCameraStream: mediasoup.remotePeerCameraStream,
      remoteParticipants: mediasoup.remoteParticipants,
      peers: mediasoup.peers,
      micEnabled: mediasoup.micEnabled,
      cameraEnabled: mediasoup.cameraEnabled,
      screenSharing: mediasoup.screenSharing,
      toggleMic: mediasoup.toggleMic,
      toggleCamera: mediasoup.toggleCamera,
      toggleScreenShare: mediasoup.toggleScreenShare,
      localMediaDeviceError: mediasoup.localMediaDeviceError,
      clearLocalMediaDeviceError: mediasoup.clearLocalMediaDeviceError,
      screenShareTiles: mediasoup.screenShareTiles,
      focusedScreenShareKey: mediasoup.focusedScreenShareKey,
      setFocusedScreenShareKey: mediasoup.setFocusedScreenShareKey,
      remoteTrackMediaSource: mediasoup.remoteTrackMediaSource,
      dominantSpeakerPeerId: mediasoup.dominantSpeakerPeerId,
      dominantSpeakerSpeakingMs: mediasoup.dominantSpeakerSpeakingMs,
    }),
    [
      rtc.rtcToken,
      rtc.rtcTokenExpiresInSec,
      rtc.rtcTokenLoading,
      rtc.rtcTokenError,
      rtc.rtcTokenErrorCode,
      rtc.rtcTokenSkipped,
      rtc.refetchRtcToken,
      rtcSocket,
      rtcSocketState,
      activeRoomId,
      roomConversationId,
      rtcRoomType,
      mediasoup.status,
      mediasoup.error,
    mediasoup.localPreviewStream,
    mediasoup.localStream,
    mediasoup.localScreenTrackId,
    mediasoup.remoteStream,
      mediasoup.mainStageShowsScreen,
      mediasoup.remotePeerCameraStream,
      mediasoup.remoteParticipants,
      mediasoup.peers,
      mediasoup.micEnabled,
      mediasoup.cameraEnabled,
      mediasoup.screenSharing,
      mediasoup.toggleMic,
      mediasoup.toggleCamera,
      mediasoup.toggleScreenShare,
      mediasoup.localMediaDeviceError,
      mediasoup.clearLocalMediaDeviceError,
      mediasoup.screenShareTiles,
      mediasoup.focusedScreenShareKey,
      mediasoup.setFocusedScreenShareKey,
      mediasoup.remoteTrackMediaSource,
      mediasoup.dominantSpeakerPeerId,
      mediasoup.dominantSpeakerSpeakingMs,
    ],
  );

  return <RtcSocketContext.Provider value={value}>{children}</RtcSocketContext.Provider>;
}

export function useRtcSocketContext(): RtcSocketContextValue {
  const ctx = useContext(RtcSocketContext);
  if (!ctx) {
    throw new Error("useRtcSocketContext must be used within RtcSocketProvider");
  }
  return ctx;
}
