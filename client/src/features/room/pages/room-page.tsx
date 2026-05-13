"use client";

/**
 * RoomPage is the `/circle/[roomId]` route entry for all call sessions.
 *
 * Purpose:
 * - Loads room/query context and determines direct vs circle layout mode.
 * - Triggers join/start-video flow once prerequisites are ready.
 * - Switches between loading/error states, full call UI (`RoomVideoLayer`), and minimized mode.
 */
import { useAppDispatch, useAppSelector } from "@/lib/redux/hooks";
import {
  selectIsRoomMinimized,
  selectIsVideoSessionActive,
} from "@/lib/redux/selectors/room-selectors";
import { useSession } from "@/lib/auth-client";
import { useRoom } from "@/features/matching";
import { isCircleRoomData, isRoomGroupLayout } from "@/features/matching/types/room.types";
import { RoomVideoLayer } from "@/features/room/components/room-video-layer";
import { useRoomJoinAndStartVideo } from "@/features/room/hooks/use-room-join-and-start-video";

/**
 * `/circle/[roomId]`: loading → join room → start video session → full UI or minimized dock.
 */
export function RoomPage() {
  const dispatch = useAppDispatch();
  const sessionActive = useAppSelector(selectIsVideoSessionActive);
  const isMinimized = useAppSelector(selectIsRoomMinimized);
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
  const circleCanEditTitle = (() => {
    if (!isCircleRoom || !uid || !room) return false;
    if (isCircleRoomData(room)) return room.hostUserId === uid;
    if ("userA" in room && room.roomType === "circle" && room.hostUserId) {
      return room.hostUserId === uid;
    }
    return false;
  })();
  const circleHostUserId =
    room && isCircleRoomData(room)
      ? room.hostUserId
      : room && "hostUserId" in room && typeof room.hostUserId === "string"
        ? room.hostUserId
        : null;
  const circleLobbyGateActive =
    room && isCircleRoomData(room) ? (room.lobbyGateActive ?? null) : null;
  const shouldStartVideo =
    !duplicateTabRedirect &&
    !loading &&
    Boolean(room) &&
    (isCircleRoom || Boolean(peerId));

  const { joinRoomError, joinRoomLoading } = useRoomJoinAndStartVideo({
    roomId,
    shouldStartVideo,
    sessionActive,
    peerId,
    dispatch,
  });

  if (loading || joinRoomLoading || (shouldStartVideo && !sessionActive && !joinRoomError)) {
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

  if (joinRoomError) {
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

  if (error && !room) {
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

  if (sessionActive && !isMinimized) {
    return (
      <RoomVideoLayer
        roomId={roomId}
        peerId={peerId}
        scoreLabel={scoreLabel}
        myName={myName}
        isGroupRoom={isCircleRoom}
        groupRoomTitle={
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
        isDbCircleCall={Boolean(room && isCircleRoomData(room))}
      />
    );
  }

  return null;
}
