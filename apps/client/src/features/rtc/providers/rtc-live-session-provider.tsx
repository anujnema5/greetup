"use client";

import { useEffect, useMemo } from "react";
import { useRoomStore } from "@/features/room/state/room.store";
import { deriveRoomRtcState } from "@/features/rtc/lib/derive-room-rtc-state";
import { useRtcToken } from "@/features/rtc/api/rtc.queries";
import { useRtcSocket } from "@/features/rtc/hooks/use-rtc-socket";
import { useMediasoupRoom } from "@/features/rtc/hooks/use-mediasoup-room";
import type { RtcSocketContextValue } from "@/features/rtc/types/rtc-socket-context.types";
import {
  mapMediasoupToSliceStatus,
  RtcSocketContext,
} from "@/features/rtc/providers/rtc-socket-context";

export type RtcLiveSessionProviderProps = {
  children: React.ReactNode;
  activeRoomId: string;
  sessionActive: boolean;
  rtcPrimaryRemoteUserId: string | null;
  sessionUser: {
    id?: string | null;
    displayName?: string | null;
    name?: string | null;
    image?: string | null;
  };
  profileDisplayName: string | null;
};

/**
 * Token fetch, rtc-service socket, and mediasoup — lazy-loaded chunk (mediasoup-client).
 */
export function RtcLiveSessionProvider({
  children,
  activeRoomId,
  sessionActive,
  rtcPrimaryRemoteUserId,
  sessionUser,
  profileDisplayName,
}: RtcLiveSessionProviderProps) {
  const setMediaStatus = useRoomStore((s) => s.setMediaStatus);

  const rtcQuery = useRtcToken(activeRoomId, { enabled: true });
  const rtc = deriveRoomRtcState(false, rtcQuery);
  const { rtcSocket, rtcSocketState } = useRtcSocket(rtc.rtcToken ?? null);

  const mediasoupEnabled = sessionActive && rtcSocketState === "connected";
  const rtcRoomType = rtcQuery.data?.roomType ?? null;
  const roomConversationId = rtcQuery.data?.conversationId ?? null;

  const mediasoup = useMediasoupRoom({
    enabled: mediasoupEnabled,
    rtcSocket,
    rtcSocketState,
    rtcRoomId: activeRoomId,
    rtcRoomType,
    localUserId: sessionUser.id ?? null,
    localDisplayName: profileDisplayName ?? sessionUser.displayName ?? sessionUser.name ?? null,
    localProfileImageUrl: sessionUser.image ?? null,
    preferredRemotePeerId: rtcPrimaryRemoteUserId,
  });

  useEffect(() => {
    setMediaStatus(mapMediasoupToSliceStatus(sessionActive, mediasoup.status));
  }, [setMediaStatus, sessionActive, mediasoup.status]);

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
