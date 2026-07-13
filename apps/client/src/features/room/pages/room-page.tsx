"use client";

import {
  selectIsRoomMinimized,
  selectIsVideoSessionActive,
  selectLocalLeavePending,
  selectRoomPhase,
  useRoomStore,
} from "@/features/room/state/room.store";
import { useSession } from "@/lib/auth-client";
import { useRoom } from "@/features/matching";
import {
  isSpaceHostUser,
  isSpaceRoomData,
  isPersistedSpaceSession,
  isRoomGroupLayout,
  resolveSpaceHostUserId,
} from "@/features/matching/types/room.types";
import { InCallContainer } from "@/features/room/call/shell/in-call-container";
import { SpaceRouteLoadingShell } from "@/features/room/components/search/space-route-loading-shell";
import { useRoomJoinAndStartVideo } from "@/features/room/hooks/session/use-room-join-and-start-video";
import { isConnectionCallSession } from "@/features/room/lib/session/room-session-kind";

export function RoomPage() {
  const sessionActive = useRoomStore(selectIsVideoSessionActive);
  const roomPhase = useRoomStore(selectRoomPhase);
  const isMinimized = useRoomStore(selectIsRoomMinimized);
  const localLeavePending = useRoomStore(selectLocalLeavePending);
  const isSearchingNext = roomPhase === "searching";
  const { data: session } = useSession();

  const {
    roomId,
    loading,
    error,
    peerId,
    score,
    currentUserName,
    goHome,
    room,
    rtcRoomType,
    duplicateTabRedirect,
  } = useRoom();

  const myName = currentUserName ?? "You";
  const scoreLabel = score != null && String(score).length > 0 ? `${String(score)}% match` : null;
  const isSpaceRoom = isRoomGroupLayout(room, rtcRoomType);
  const uid = session?.user?.id;
  const spaceHostUserId = resolveSpaceHostUserId(room);
  const spaceCanEditTitle = isSpaceHostUser(room, uid, rtcRoomType);
  const isPersistedSpaceCall = isPersistedSpaceSession(room, rtcRoomType);
  const spaceLobbyGateActive =
    room && isSpaceRoomData(room) ? (room.lobbyGateActive ?? null) : null;
  const isConnectionCall = isConnectionCallSession(room);
  const rematchLanding = isSearchingNext && Boolean(peerId);
  const shouldStartVideo =
    !duplicateTabRedirect &&
    (rematchLanding || (!loading && Boolean(room))) &&
    (isSpaceRoom || isConnectionCall || Boolean(peerId)) &&
    (!isSearchingNext || rematchLanding);

  const { joinRoomError, joinRoomLoading } = useRoomJoinAndStartVideo({
    roomId,
    shouldStartVideo,
    sessionActive,
    joinWhileSessionActive: rematchLanding,
    peerId,
  });

  const showCallSurface = (sessionActive || isSearchingNext) && !isMinimized;
  const transientMatchRoomLoss =
    sessionActive &&
    roomPhase === "in_call" &&
    !isSearchingNext &&
    !localLeavePending &&
    Boolean(error) &&
    !room &&
    !isSpaceRoom;

  if (localLeavePending) {
    return <SpaceRouteLoadingShell message="Leaving call…" />;
  }

  if (transientMatchRoomLoss) {
    return <SpaceRouteLoadingShell message="Partner left — finding next match…" />;
  }

  if (
    !isSearchingNext &&
    (loading || joinRoomLoading || (shouldStartVideo && !sessionActive && !joinRoomError))
  ) {
    return (
      <div className="flex h-dvh w-full items-center justify-center bg-background text-sm text-muted-foreground">
        {duplicateTabRedirect
          ? "Redirecting…"
          : joinRoomLoading
            ? "Joining room…"
            : "Connecting to room…"}
      </div>
    );
  }

  if (!isSearchingNext && joinRoomError) {
    return (
      <div className="flex h-dvh w-full flex-col items-center justify-center gap-4 bg-background px-4">
        <p className="text-center text-sm text-muted-foreground">{joinRoomError}</p>
        <button
          type="button"
          onClick={goHome}
          className="cursor-pointer text-xs text-primary underline underline-offset-2"
        >
          Back to dashboard
        </button>
      </div>
    );
  }

  if (!isSearchingNext && error && !room) {
    return (
      <div className="flex h-dvh w-full flex-col items-center justify-center gap-4 bg-background">
        <p className="text-sm text-muted-foreground">{error}</p>
        <button
          type="button"
          onClick={goHome}
          className="cursor-pointer text-xs text-primary underline underline-offset-2"
        >
          Back to dashboard
        </button>
      </div>
    );
  }

  if (showCallSurface) {
    return (
      <InCallContainer
        key={roomId}
        roomId={roomId}
        peerId={peerId}
        scoreLabel={scoreLabel}
        myName={myName}
        isGroupRoom={isSpaceRoom}
        spaceDisplayTitle={
          room && "title" in room && typeof room.title === "string" ? room.title : null
        }
        spaceCanEditTitle={spaceCanEditTitle}
        spaceHostUserId={spaceHostUserId}
        spaceLobbyGateActive={spaceLobbyGateActive}
        spaceScheduledStartAt={
          room && isSpaceRoomData(room) && room.scheduledStartAt ? room.scheduledStartAt : null
        }
        spaceRoomStatus={
          room && isSpaceRoomData(room) && room.status ? room.status : null
        }
        isDbSpaceCall={isPersistedSpaceCall}
        room={room}
      />
    );
  }

  return null;
}
