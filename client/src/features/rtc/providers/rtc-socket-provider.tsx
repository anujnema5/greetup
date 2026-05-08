"use client";

import { createContext, useContext, useEffect, useMemo } from "react";
import { useSession } from "@/lib/auth-client";
import { useAppDispatch, useAppSelector } from "@/lib/redux/hooks";
import { useGetMyProfileQuery } from "@/features/profile-setup/components/profile-setup-api";
import { useRoomTabLeaseRtcSync } from "@/features/room";
import {
  selectActiveRoomId,
  selectIsVideoSessionActive,
  selectRtcPrimaryRemoteUserId,
} from "@/lib/redux/selectors/room-selectors";
import { setMediaStatus } from "@/lib/redux/slices/room-slice";
import { deriveRoomRtcState } from "@/features/rtc/lib/derive-room-rtc-state";
import { useGetRtcTokenQuery } from "../api/rtc-api";
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
  const dispatch = useAppDispatch();
  const activeRoomId = useAppSelector(selectActiveRoomId);
  const sessionActive = useAppSelector(selectIsVideoSessionActive);
  const rtcPrimaryRemoteUserId = useAppSelector(selectRtcPrimaryRemoteUserId);
  const { data: session, isPending: sessionPending } = useSession();
  const { data: myProfileData } = useGetMyProfileQuery(undefined, { skip: sessionPending });
  const sessionUser = session?.user as
    | { id?: string | null; displayName?: string | null; name?: string | null; image?: string | null }
    | undefined;
  const profileDisplayName = myProfileData?.data?.displayName ?? null;

  const skipRtcToken = !activeRoomId || sessionPending || !sessionUser?.id;

  const rtcQuery = useGetRtcTokenQuery(activeRoomId ?? "", {
    skip: skipRtcToken,
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
    dispatch(setMediaStatus(mapMediasoupToSliceStatus(sessionActive, mediasoup.status)));
  }, [dispatch, sessionActive, mediasoup.status]);

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
      rtcTokenSkipped: rtc.rtcTokenSkipped,
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
    }),
    [
      rtc.rtcToken,
      rtc.rtcTokenExpiresInSec,
      rtc.rtcTokenLoading,
      rtc.rtcTokenError,
      rtc.rtcTokenSkipped,
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
    ],
  );

  return (
    <RtcSocketContext.Provider value={value}>{children}</RtcSocketContext.Provider>
  );
}

export function useRtcSocketContext(): RtcSocketContextValue {
  const ctx = useContext(RtcSocketContext);
  if (!ctx) {
    throw new Error("useRtcSocketContext must be used within RtcSocketProvider");
  }
  return ctx;
}
