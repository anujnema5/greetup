"use client";

import { useEffect, useCallback } from "react";
import { useAppDispatch, useAppSelector } from "@/lib/redux/hooks";
import {
  selectIsRoomMinimized,
  selectIsVideoSessionActive,
} from "@/lib/redux/selectors/room-selectors";
import { startVideoSession } from "@/lib/redux/slices/roomSlice";
import { useRoom } from "@/features/matching";
import { RoomVideoView } from "@/features/room/components/room-video-view";
import { useRoomVideo } from "@/features/room/hooks/use-room-video";
import { markRoomActive, broadcastRoomMessage } from "@/features/room/lib/room-sync";

function RoomVideoLayer({
  roomId,
  onEnd,
}: {
  roomId: string;
  onEnd: () => void;
}) {
  const video = useRoomVideo(roomId);
  return (
    <div className="fixed inset-0 z-100 flex flex-col overflow-hidden bg-background">
      <RoomVideoView
        onEnd={onEnd}
        onSkip={video.handleSkip}
        onMinimize={video.handleMinimize}
      />
    </div>
  );
}

/**
 * `/circle/[roomId]`: shows a connecting state, then immediately starts the video.
 */
export function RoomPage() {
  const dispatch = useAppDispatch();
  const sessionActive = useAppSelector(selectIsVideoSessionActive);
  const isMinimized = useAppSelector(selectIsRoomMinimized);

  const {
    roomId,
    loading,
    error,
    peerId,
    goHome,
    leaveAndGoHome,
    rtcSocket
  } = useRoom();

  console.log(rtcSocket ? `RTC Socket connected: ${rtcSocket.id}` : "RTC Socket not connected");

  // Auto-start video as soon as the peer is connected
  useEffect(() => {
    if (peerId && !sessionActive) {
      markRoomActive();
      dispatch(startVideoSession({ roomId }));
    }
  }, [peerId, sessionActive, dispatch, roomId]);

  // Full end-call: notify peer, call backend leave API, clear storage & Redux, navigate home
  const handleEnd = useCallback(() => {
    broadcastRoomMessage({ type: "END_CALL" });
    leaveAndGoHome();
  }, [leaveAndGoHome]);

  if (loading || (peerId && !sessionActive)) {
    return (
      <div className="flex h-dvh w-full items-center justify-center bg-background text-sm text-muted-foreground">
        Connecting to room…
      </div>
    );
  }

  if (error && !peerId) {
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
    return <RoomVideoLayer roomId={roomId} onEnd={handleEnd} />;
  }

  // Minimized state — the floating dock handles UI; render nothing here
  return null;
}
