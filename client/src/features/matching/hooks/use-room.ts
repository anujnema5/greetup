"use client";

import { useCallback, useEffect, useMemo } from "react";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import { useSession } from "@/lib/auth-client";
import { getApiErrorMessage } from "@/lib/api/fetch-client";
import { useRoomStore } from "@/features/room/state/room.store";
import { useRoomPageTabLease } from "@/features/room/hooks";
import { clearRoomStorage } from "@/features/room/lib/session/room-sync";
import { useGetRoom } from "@/features/room/api/room.queries";
import { useLeaveCircleRtc, useLeaveRoom } from "@/features/room/api/room.mutations";
import { useRtcSocketContext } from "@/features/rtc";
import {
  clearCircleRoomBootstrap,
  migrateLegacyCircleRoomQuery,
  readCircleRoomSeeds,
} from "@/features/matching/lib/circle-room-bootstrap";
import {
  isCircleSession,
  isConnectionCallSession,
} from "@/features/room/lib/session/room-session-kind";
import { isCircleRoomData, type MatchRoomData, type RoomData } from "../types/room.types";
import { useMyProfile } from "@/features/profile-setup/api";

export type { RoomData };

/**
 * `/circle/[roomId]`: room query, tab lease, RTC context, leave/cleanup.
 * Peer + score for fresh 1:1 joins: `readCircleRoomSeeds` (session + optional legacy query).
 * Legacy `?peer=&score=` is migrated via `migrateLegacyCircleRoomQuery` then stripped from the URL.
 */
export function useRoom() {
  const resetRoomState = useRoomStore((s) => s.resetRoomState);
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const { data: session, isPending: sessionPending } = useSession();
  const { data: myProfileData } = useMyProfile({ enabled: !sessionPending });
  const { mutateAsync: leaveRoom } = useLeaveRoom();
  const { mutateAsync: leaveCircleRtc } = useLeaveCircleRtc();

  const roomId = params.roomId as string;
  const legacyPeer = searchParams.get("peer");
  const legacyScore = searchParams.get("score");
  const { seedPeerId, seedScore } = readCircleRoomSeeds(roomId, legacyPeer, legacyScore);

  useEffect(() => {
    migrateLegacyCircleRoomQuery(roomId, legacyPeer, legacyScore, (path) =>
      router.replace(path, { scroll: false }),
    );
  }, [roomId, legacyPeer, legacyScore, router]);

  const currentUserId = session?.user?.id ?? null;

  const { duplicateTabRedirect, clearLeaseIfOwner } = useRoomPageTabLease({
    roomId,
    currentUserId,
    sessionPending,
    router,
  });

  const skipRoomQuery = !roomId || sessionPending;
  const roomQuery = useGetRoom(roomId, { enabled: !skipRoomQuery });

  useEffect(() => {
    if (roomQuery.isSuccess && roomQuery.data) {
      clearCircleRoomBootstrap(roomId);
    }
  }, [roomId, roomQuery.isSuccess, roomQuery.data]);

  const {
    rtcToken,
    rtcTokenExpiresInSec,
    rtcTokenLoading,
    rtcTokenError,
    rtcTokenSkipped,
    rtcSocket,
    rtcSocketState,
    mediasoupStatus,
    mediasoupError,
    localMediaStream,
    remoteMediaStream,
    mainStageShowsScreen,
    remoteParticipants,
    peers,
    rtcRoomType,
    micEnabled,
    cameraEnabled,
    screenSharing,
    toggleMic,
    toggleCamera,
    toggleScreenShare,
    localMediaDeviceError,
    clearLocalMediaDeviceError,
  } = useRtcSocketContext();

  const fallbackRoom: MatchRoomData | null =
    roomQuery.isError && seedPeerId && session?.user?.id
      ? {
          sessionKind: "match",
          roomId,
          userA: session.user.id,
          userB: seedPeerId,
          matchScore: seedScore,
        }
      : null;

  const room = roomQuery.data ?? fallbackRoom;

  const loading =
    sessionPending || (!skipRoomQuery && (roomQuery.isPending || roomQuery.isFetching));

  const error = useMemo(() => {
    if (room) return null;
    if (!roomQuery.isError) return null;
    return getApiErrorMessage(roomQuery.error, "Could not load room");
  }, [room, roomQuery.isError, roomQuery.error]);

  const sessionUser = session?.user as
    | { displayName?: string | null; name?: string | null }
    | undefined;

  const peerId = useMemo(() => {
    if (!room) return seedPeerId ?? null;
    if (isCircleSession(room)) return null;
    if (isConnectionCallSession(room)) return seedPeerId ?? null;
    if ("userA" in room) {
      return room.userA === currentUserId ? room.userB : room.userA;
    }
    return seedPeerId ?? null;
  }, [room, currentUserId, seedPeerId]);

  const currentUserName =
    myProfileData?.displayName ?? sessionUser?.displayName ?? sessionUser?.name ?? null;

  const score = useMemo(() => {
    if (room && (isCircleSession(room) || isConnectionCallSession(room))) return null;
    return room && "matchScore" in room ? room.matchScore : seedScore;
  }, [room, seedScore]);

  const goHome = useCallback(() => {
    router.replace("/home");
  }, [router]);

  const leaveRoomAndClear = useCallback(async () => {
    clearLeaseIfOwner();
    try {
      if (room && isCircleRoomData(room)) {
        await leaveCircleRtc(roomId);
      } else {
        await leaveRoom({ roomId });
      }
    } catch {
      /* best-effort */
    }
    clearRoomStorage();
    clearCircleRoomBootstrap(roomId);
    resetRoomState();
  }, [clearLeaseIfOwner, leaveRoom, leaveCircleRtc, resetRoomState, roomId, room]);

  const leaveAndGoHome = useCallback(() => {
    void leaveRoomAndClear().then(() => router.replace("/home"));
  }, [leaveRoomAndClear, router]);

  return {
    roomId,
    room,
    loading,
    error,
    peerId,
    score,
    currentUserId: currentUserId ?? undefined,
    duplicateTabRedirect,
    currentUserName,
    goHome,
    leaveAndGoHome,
    rtcToken,
    rtcTokenLoading,
    rtcTokenError,
    rtcTokenSkipped,
    rtcTokenExpiresInSec,
    rtcSocket,
    rtcSocketState,
    mediasoupStatus,
    mediasoupError,
    localMediaStream,
    remoteMediaStream,
    mainStageShowsScreen,
    remoteParticipants,
    peers,
    rtcRoomType,
    micEnabled,
    cameraEnabled,
    screenSharing,
    toggleMic,
    toggleCamera,
    toggleScreenShare,
    localMediaDeviceError,
    clearLocalMediaDeviceError,
  };
}
