"use client";

import { useAppDispatch, useAppSelector } from "@/lib/redux/hooks";
import {
  selectIsRoomMinimized,
  selectIsVideoSessionActive,
  selectRoomPhase,
} from "@/lib/redux/selectors/room-selectors";
import { useSession } from "@/lib/auth-client";
import { useRoom } from "@/features/matching";
import {
  isCircleHostUser,
  isCircleRoomData,
  isPersistedCircleSession,
  isRoomGroupLayout,
  resolveCircleHostUserId,
} from "@/features/matching/types/room.types";
import { InCallContainer } from "@/features/room/call/shell/in-call-container";
import { useRoomJoinAndStartVideo } from "@/features/room/hooks/session/use-room-join-and-start-video";

export function RoomPage() {
  const dispatch = useAppDispatch();
  const sessionActive = useAppSelector(selectIsVideoSessionActive);
  const roomPhase = useAppSelector(selectRoomPhase);
  const isMinimized = useAppSelector(selectIsRoomMinimized);
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
  const isCircleRoom = isRoomGroupLayout(room, rtcRoomType);
  const uid = session?.user?.id;
  const circleHostUserId = resolveCircleHostUserId(room);
  const circleCanEditTitle = isCircleHostUser(room, uid, rtcRoomType);
  const isPersistedCircleCall = isPersistedCircleSession(room, rtcRoomType);
  const circleLobbyGateActive =
    room && isCircleRoomData(room) ? (room.lobbyGateActive ?? null) : null;
  const rematchLanding = isSearchingNext && Boolean(peerId);
  const shouldStartVideo =
    !duplicateTabRedirect &&
    (rematchLanding || (!loading && Boolean(room))) &&
    (isCircleRoom || Boolean(peerId)) &&
    (!isSearchingNext || rematchLanding);

  const { joinRoomError, joinRoomLoading } = useRoomJoinAndStartVideo({
    roomId,
    shouldStartVideo,
    sessionActive,
    joinWhileSessionActive: rematchLanding,
    peerId,
    dispatch,
  });

  const showCallSurface = (sessionActive || isSearchingNext) && !isMinimized;

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
        isGroupRoom={isCircleRoom}
        circleDisplayTitle={
          room && "title" in room && typeof room.title === "string" ? room.title : null
        }
        circleCanEditTitle={circleCanEditTitle}
        circleHostUserId={circleHostUserId}
        circleLobbyGateActive={circleLobbyGateActive}
        circleScheduledStartAt={
          room && isCircleRoomData(room) && room.scheduledStartAt ? room.scheduledStartAt : null
        }
        circleRoomStatus={
          room && isCircleRoomData(room) && room.status ? room.status : null
        }
        isDbCircleCall={isPersistedCircleCall}
      />
    );
  }

  return null;
}
