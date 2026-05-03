"use client";

import { useCallback, useMemo } from "react";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import { useSession } from "@/lib/auth-client";
import { getRtkQueryErrorMessage } from "@/lib/api/rtk-query-error";
import { useAppDispatch } from "@/lib/redux/hooks";
import { resetRoomState } from "@/lib/redux/slices/room-slice";
import { useRoomPageTabLease } from "@/features/room";
import { clearRoomStorage } from "@/features/room/lib/room-sync";
import { useGetRoomQuery, useLeaveRoomMutation } from "@/features/room/api/room-api";
import { useRtcSocketContext } from "@/features/rtc";
import { isCircleRoomData, type RoomData } from "../types/room.types";
import { useGetMyProfileQuery } from "@/features/profile-setup/components/profile-setup-api";

export type { RoomData };

/**
 * `/circle/[roomId]`: server data via RTK Query, global room context via Redux (`enterRoomPage`),
 * RTC token + socket from `RtcSocketProvider` (layout), leave + storage cleanup.
 */
export function useRoom() {
  const dispatch = useAppDispatch();
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const { data: session, isPending: sessionPending } = useSession();
  const { data: myProfileData } = useGetMyProfileQuery(undefined, { skip: sessionPending });
  const [leaveRoom] = useLeaveRoomMutation();

  const roomId = params.roomId as string;
  const peerIdFromUrl = searchParams.get("peer");
  const scoreFromUrl = searchParams.get("score");

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
    roomQuery.isError && peerIdFromUrl && session?.user?.id
      ? {
          roomId,
          userA: session.user.id,
          userB: peerIdFromUrl,
          matchScore: scoreFromUrl,
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
    if (!room) return peerIdFromUrl ?? null;
    if ("sessionKind" in room && room.sessionKind === "db_room") return null;
    return room.userA === currentUserId ? room.userB : room.userA;
  }, [room, currentUserId, peerIdFromUrl]);

  const currentUserName =
    myProfileData?.data?.displayName ?? sessionUser?.displayName ?? sessionUser?.name ?? null;

  const score = useMemo(() => {
    if (room && isCircleRoomData(room)) return null;
    return room && "matchScore" in room ? room.matchScore : scoreFromUrl;
  }, [room, scoreFromUrl]);

  const goHome = useCallback(() => {
    router.replace("/home");
  }, [router]);

  const leaveRoomAndClear = useCallback(async () => {
    clearLeaseIfOwner();
    try {
      await leaveRoom().unwrap();
    } catch {
      /* best-effort */
    }
    clearRoomStorage();
    dispatch(resetRoomState());
  }, [clearLeaseIfOwner, leaveRoom, dispatch]);

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
