"use client";

import { useCallback, useEffect, useMemo } from "react";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import { useSession } from "@/lib/auth-client";
import { getApiErrorMessage } from "@/lib/api/fetch-client";
import { useRoomStore, selectLocalLeavePending } from "@/features/room/state/room.store";
import { useRoomPageTabLease } from "@/features/room/hooks";
import { clearRoomStorage } from "@/features/room/lib/session/room-sync";
import { useGetRoom } from "@/features/room/api/room.queries";
import { useLeaveSpaceRtc, useLeaveRoom } from "@/features/room/api/room.mutations";
import { useRtcSocketContext } from "@/features/rtc";
import { prefetchRtcLiveSessionChunk } from "@/features/rtc/lib/prefetch-rtc-live-session-chunk";
import {
  clearSpaceRoomBootstrap,
  migrateLegacySpaceRoomQuery,
  readSpaceRoomSeeds,
} from "@/features/matching/lib/space-room-bootstrap";
import {
  isSpaceSession,
  isConnectionCallSession,
} from "@/features/room/lib/session/room-session-kind";
import { isSpaceRoomData, type MatchRoomData, type RoomData } from "../types/room.types";
import { useMyProfile } from "@/features/profile-setup/api";

export type { RoomData };

/**
 * `/space/[roomId]`: room query, tab lease, RTC context, leave/cleanup.
 * Peer + score for fresh 1:1 joins: `readSpaceRoomSeeds` (session + optional legacy query).
 * Legacy `?peer=&score=` is migrated via `migrateLegacySpaceRoomQuery` then stripped from the URL.
 */
export function useRoom() {
  const resetRoomState = useRoomStore((s) => s.resetRoomState);
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const { data: session, isPending: sessionPending } = useSession();
  const { data: myProfileData } = useMyProfile({ enabled: !sessionPending });
  const { mutateAsync: leaveRoom } = useLeaveRoom();
  const { mutateAsync: leaveSpaceRtc } = useLeaveSpaceRtc();

  const roomId = params.roomId as string;
  const legacyPeer = searchParams.get("peer");

  useEffect(() => {
    if (roomId) prefetchRtcLiveSessionChunk();
  }, [roomId]);
  const legacyScore = searchParams.get("score");
  const { seedPeerId, seedScore } = readSpaceRoomSeeds(roomId, legacyPeer, legacyScore);

  useEffect(() => {
    migrateLegacySpaceRoomQuery(roomId, legacyPeer, legacyScore, (path) =>
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

  const localLeavePending = useRoomStore(selectLocalLeavePending);
  const skipRoomQuery = !roomId || sessionPending || localLeavePending;
  const roomQuery = useGetRoom(roomId, { enabled: !skipRoomQuery });

  useEffect(() => {
    if (roomQuery.isSuccess && roomQuery.data) {
      clearSpaceRoomBootstrap(roomId);
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

  /** Match seeds from `match:completed` — lets join start before GET `/room/:id` returns. */
  const bootstrapMatchRoom: MatchRoomData | null =
    seedPeerId && session?.user?.id
      ? {
          sessionKind: "match",
          roomId,
          userA: session.user.id,
          userB: seedPeerId,
          matchScore: seedScore,
        }
      : null;

  const fallbackRoom: MatchRoomData | null =
    roomQuery.isError && bootstrapMatchRoom ? bootstrapMatchRoom : null;

  const room = roomQuery.data ?? bootstrapMatchRoom ?? fallbackRoom;

  const loading =
    sessionPending ||
    (!skipRoomQuery &&
      !bootstrapMatchRoom &&
      (roomQuery.isPending || roomQuery.isFetching));

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
    if (isSpaceSession(room)) return null;
    if (isConnectionCallSession(room)) return seedPeerId ?? null;
    if ("userA" in room) {
      return room.userA === currentUserId ? room.userB : room.userA;
    }
    return seedPeerId ?? null;
  }, [room, currentUserId, seedPeerId]);

  const currentUserName =
    myProfileData?.displayName ?? sessionUser?.displayName ?? sessionUser?.name ?? null;

  const score = useMemo(() => {
    if (room && (isSpaceSession(room) || isConnectionCallSession(room))) return null;
    return room && "matchScore" in room ? room.matchScore : seedScore;
  }, [room, seedScore]);

  const goHome = useCallback(() => {
    router.replace("/home");
  }, [router]);

  const leaveRoomAndClear = useCallback(async () => {
    clearLeaseIfOwner();
    try {
      if (room && isSpaceRoomData(room)) {
        await leaveSpaceRtc(roomId);
      } else {
        await leaveRoom({ roomId });
      }
    } catch {
      /* best-effort */
    }
    clearRoomStorage();
    clearSpaceRoomBootstrap(roomId);
    resetRoomState();
  }, [clearLeaseIfOwner, leaveRoom, leaveSpaceRtc, resetRoomState, roomId, room]);

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
