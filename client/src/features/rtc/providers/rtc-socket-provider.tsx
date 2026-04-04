"use client";

import { createContext, useContext, useEffect, useMemo } from "react";
import { useSession } from "@/lib/auth-client";
import { useAppDispatch, useAppSelector } from "@/lib/redux/hooks";
import {
  selectActiveRoomId,
  selectIsVideoSessionActive,
  selectRtcPrimaryRemoteUserId,
} from "@/lib/redux/selectors/room-selectors";
import { setMediaStatus } from "@/lib/redux/slices/roomSlice";
import { deriveRoomRtcState } from "@/features/matching/utils/derive-room-rtc-state";
import { useGetRtcTokenQuery } from "../api/rtc-api";
import { useRtcSocket } from "../hooks/use-rtc-socket";
import { useMediasoupRoom } from "../hooks/use-mediasoup-room";
import type { MediasoupRoomStatus, RemoteParticipant, RemotePeer } from "../types/mediasoup-room.types";
import type { RoomRtcState } from "@/features/matching/types/room.types";
import type { UseRtcSocketReturn } from "../hooks/use-rtc-socket";

export type RtcSocketContextValue = RoomRtcState &
  UseRtcSocketReturn & {
    rtcRoomId: string | null;
    mediasoupStatus: MediasoupRoomStatus;
    mediasoupError: string | null;
    localMediaStream: MediaStream | null;
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
    rtcRoomType: "direct" | "circle" | null;
    localMediaDeviceError: string | null;
    clearLocalMediaDeviceError: () => void;
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

  const skipRtcToken = !activeRoomId || sessionPending || !session?.user?.id;

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

  const mediasoup = useMediasoupRoom({
    enabled: mediasoupEnabled,
    rtcSocket,
    rtcSocketState,
    rtcRoomId: activeRoomId,
    rtcRoomType,
    localUserId: session?.user?.id ?? null,
    localDisplayName: session?.user?.name ?? null,
    preferredRemotePeerId: rtcPrimaryRemoteUserId,
  });

  useEffect(() => {
    dispatch(setMediaStatus(mapMediasoupToSliceStatus(sessionActive, mediasoup.status)));
  }, [dispatch, sessionActive, mediasoup.status]);

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
      rtcRoomType,
      mediasoupStatus: mediasoup.status,
      mediasoupError: mediasoup.error,
      localMediaStream: mediasoup.localPreviewStream,
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
      rtcRoomType,
      mediasoup.status,
      mediasoup.error,
      mediasoup.localPreviewStream,
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
