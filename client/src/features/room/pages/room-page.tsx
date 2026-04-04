"use client";

import { useCallback } from "react";
import { useAppDispatch, useAppSelector } from "@/lib/redux/hooks";
import {
  selectIsRoomMinimized,
  selectIsVideoSessionActive,
} from "@/lib/redux/selectors/room-selectors";
import { useRoom } from "@/features/matching";
import { isCircleRoomData } from "@/features/matching/types/room.types";
import { RoomVideoLayer } from "@/features/room/components/room-video-layer";
import { useRoomJoinAndStartVideo } from "@/features/room/hooks/use-room-join-and-start-video";
import { broadcastRoomMessage } from "@/features/room/lib/room-sync";

/**
 * `/circle/[roomId]`: loading → join room → start video session → full UI or minimized dock.
 */
export function RoomPage() {
  const dispatch = useAppDispatch();
  const sessionActive = useAppSelector(selectIsVideoSessionActive);
  const isMinimized = useAppSelector(selectIsRoomMinimized);

  const { roomId, loading, error, peerId, score, currentUserName, goHome, leaveAndGoHome, room } =
    useRoom();

  const myName = currentUserName ?? "You";
  const scoreLabel =
    score != null && String(score).length > 0 ? `${String(score)}% match` : null;

  const isCircleRoom = Boolean(room && isCircleRoomData(room));
  const shouldStartVideo =
    !loading && Boolean(room) && (isCircleRoom || Boolean(peerId));

  const { joinRoomError, joinRoomLoading } = useRoomJoinAndStartVideo({
    roomId,
    shouldStartVideo,
    sessionActive,
    peerId,
    dispatch,
  });

  const handleEnd = useCallback(() => {
    broadcastRoomMessage({ type: "END_CALL" });
    leaveAndGoHome();
  }, [leaveAndGoHome]);

  if (loading || joinRoomLoading || (shouldStartVideo && !sessionActive && !joinRoomError)) {
    return (
      <div className="flex h-dvh w-full items-center justify-center bg-background text-sm text-muted-foreground">
        {joinRoomLoading ? "Joining room…" : "Connecting to room…"}
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
          className="text-xs text-primary underline underline-offset-2"
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
          className="text-xs text-primary underline underline-offset-2"
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
        onEnd={handleEnd}
        peerId={peerId}
        scoreLabel={scoreLabel}
        myName={myName}
        isGroupRoom={isCircleRoom}
        groupRoomTitle={room && isCircleRoomData(room) ? room.title : null}
      />
    );
  }

  return null;
}
