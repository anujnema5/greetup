"use client";

import dynamic from "next/dynamic";
import { createContext, useCallback, useContext, useMemo, useRef, useState } from "react";

import { useGetMyProfileQuery } from "@/features/profile-setup/components/profile-setup-api";
import { useRoomTabLeaseRtcSync } from "@/features/room/hooks";
import { useSession } from "@/lib/auth-client";
import { useAppSelector } from "@/lib/redux/hooks";
import {
  selectActiveRoomId,
  selectIsVideoSessionActive,
  selectRtcPrimaryRemoteUserId,
} from "@/lib/redux/selectors/room-selectors";

import { useGetRtcTokenQuery } from "../api/rtc-api";
import { deriveRoomRtcState } from "../lib/derive-room-rtc-state";
import { IDLE_MEDIASOUP_STATE } from "../lib/idle-mediasoup-state";
import { getMediasoupSnapshotKey } from "../lib/mediasoup-snapshot-key";
import { useRtcSocket } from "../hooks/use-rtc-socket";
import type {
  MediasoupRoomStatus,
  ProducerMediaSource,
  RemoteParticipant,
  RemotePeer,
  ScreenShareTileInfo,
  UseMediasoupRoomReturn,
} from "../types/mediasoup-room.types";
import type { RoomRtcState } from "../types/rtc-api.types";
import type { UseRtcSocketReturn } from "../hooks/use-rtc-socket";
import type { RoomSessionType } from "@/shared/types/room-session";

const RtcMediasoupBridge = dynamic(
  () => import("./rtc-mediasoup-bridge").then((m) => m.RtcMediasoupBridge),
  { ssr: false },
);

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

/**
 * Owns rtc-service Socket.IO + mediasoup session for the active call.
 * Mediasoup stays mounted while `sessionActive` so minimized dock keeps the same streams.
 */
export function RtcSocketProvider({ children }: { children: React.ReactNode }) {
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

  const [bridgedMediasoup, setBridgedMediasoup] = useState<UseMediasoupRoomReturn>(IDLE_MEDIASOUP_STATE);
  const bridgedSnapshotRef = useRef(getMediasoupSnapshotKey(IDLE_MEDIASOUP_STATE));
  const mediasoup = mediasoupEnabled ? bridgedMediasoup : IDLE_MEDIASOUP_STATE;

  const onMediasoupStateChange = useCallback((state: UseMediasoupRoomReturn) => {
    const snapshot = getMediasoupSnapshotKey(state);
    if (snapshot === bridgedSnapshotRef.current) return;
    bridgedSnapshotRef.current = snapshot;
    setBridgedMediasoup(state);
  }, []);

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
      mediasoup,
    ],
  );

  return (
    <RtcSocketContext.Provider value={value}>
      {mediasoupEnabled ? (
        <RtcMediasoupBridge
          key={activeRoomId ?? "none"}
          sessionActive={sessionActive}
          onStateChange={onMediasoupStateChange}
          enabled={mediasoupEnabled}
          rtcSocket={rtcSocket}
          rtcSocketState={rtcSocketState}
          rtcRoomId={activeRoomId}
          rtcRoomType={rtcRoomType}
          localUserId={sessionUser?.id ?? null}
          localDisplayName={profileDisplayName ?? sessionUser?.displayName ?? sessionUser?.name ?? null}
          localProfileImageUrl={sessionUser?.image ?? null}
          preferredRemotePeerId={rtcPrimaryRemoteUserId}
        />
      ) : null}
      {children}
    </RtcSocketContext.Provider>
  );
}

export function useRtcSocketContext(): RtcSocketContextValue {
  const ctx = useContext(RtcSocketContext);
  if (!ctx) {
    throw new Error("useRtcSocketContext must be used within RtcSocketProvider");
  }
  return ctx;
}
