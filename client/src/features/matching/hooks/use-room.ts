"use client";

import { useCallback, useEffect, useMemo } from "react";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import { useSession } from "@/lib/auth-client";
import { getRtkQueryErrorMessage } from "@/lib/api/rtk-query-error";
import { useAppDispatch } from "@/lib/redux/hooks";
import { resetRoomState } from "@/lib/redux/slices/room-slice";
import { useRoomPageTabLease } from "@/features/room";
import { clearRoomStorage } from "@/features/room/lib/room-sync";
import { useGetRoomQuery, useLeaveRoomMutation, useLeaveCircleRtcMutation } from "@/features/room/api/room-api";
import { useRtcSocketContext } from "@/features/rtc";
import {
  clearCircleRoomBootstrap,
  migrateLegacyCircleRoomQuery,
  readCircleRoomSeeds,
} from "@/features/matching/lib/circle-room-bootstrap";
import { isCircleRoomData, type RoomData } from "../types/room.types";
import { useGetMyProfileQuery } from "@/features/profile-setup/components/profile-setup-api";

export type { RoomData };

/**
 * `/circle/[roomId]`: RTK room fetch, tab lease, RTC context, leave/cleanup.
 * Peer + score for fresh 1:1 joins: `readCircleRoomSeeds` (session + optional legacy query).
 * Legacy `?peer=&score=` is migrated via `migrateLegacyCircleRoomQuery` then stripped from the URL.
 */
export function useRoom() {
  const dispatch = useAppDispatch();
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const { data: session, isPending: sessionPending } = useSession();
  const { data: myProfileData } = useGetMyProfileQuery(undefined, { skip: sessionPending });
  const [leaveRoom] = useLeaveRoomMutation();
  const [leaveCircleRtc] = useLeaveCircleRtcMutation();

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
    dispatch,
    router,
  });

  const skipRoomQuery = !roomId || sessionPending;
  const roomQuery = useGetRoomQuery(roomId, { skip: skipRoomQuery });

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

  const fallbackRoom: RoomData | null =
    roomQuery.isError && seedPeerId && session?.user?.id
      ? {
          roomId,
          userA: session.user.id,
          userB: seedPeerId,
          matchScore: seedScore,
        }
      : null;

  const room = roomQuery.data ?? fallbackRoom;

  const loading =
    sessionPending || (!skipRoomQuery && (roomQuery.isLoading || roomQuery.isFetching));

  const error = useMemo(() => {
    if (room) return null;
    if (!roomQuery.isError) return null;
    return getRtkQueryErrorMessage(roomQuery.error);
  }, [room, roomQuery.isError, roomQuery.error]);

  const sessionUser = session?.user as
    | { displayName?: string | null; name?: string | null }
    | undefined;

  const peerId = useMemo(() => {
    if (!room) return seedPeerId ?? null;
    if ("sessionKind" in room && room.sessionKind === "db_room") return null;
    return room.userA === currentUserId ? room.userB : room.userA;
  }, [room, currentUserId, seedPeerId]);

  const currentUserName =
    myProfileData?.data?.displayName ?? sessionUser?.displayName ?? sessionUser?.name ?? null;

  const score = useMemo(() => {
    if (room && isCircleRoomData(room)) return null;
    return room && "matchScore" in room ? room.matchScore : seedScore;
  }, [room, seedScore]);

  const goHome = useCallback(() => {
    router.replace("/home");
  }, [router]);

  const leaveRoomAndClear = useCallback(async () => {
    clearLeaseIfOwner();
    try {
      if (room && isCircleRoomData(room)) {
        await leaveCircleRtc(roomId).unwrap();
      } else {
        await leaveRoom().unwrap();
      }
    } catch {
      /* best-effort */
    }
    clearRoomStorage();
    clearCircleRoomBootstrap(roomId);
    dispatch(resetRoomState());
  }, [clearLeaseIfOwner, leaveRoom, leaveCircleRtc, dispatch, roomId, room]);

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
