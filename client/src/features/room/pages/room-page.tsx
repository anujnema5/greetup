"use client";

import { useEffect, useCallback } from "react";
import { useAppDispatch, useAppSelector } from "@/lib/redux/hooks";
import {
  selectIsRoomMinimized,
  selectIsVideoSessionActive,
} from "@/lib/redux/selectors/room-selectors";
import { startVideoSession } from "@/lib/redux/slices/roomSlice";
import { useRoom } from "@/features/matching";
import { useRtcSocketContext } from "@/features/rtc";
import { RoomVideoView } from "@/features/room/components/room-video-view";
import { useRoomVideo } from "@/features/room/hooks/use-room-video";
import { markRoomActive, broadcastRoomMessage } from "@/features/room/lib/room-sync";

function RoomVideoLayer({
  roomId,
  onEnd,
  peerId,
  scoreLabel,
  myName,
}: {
  roomId: string;
  onEnd: () => void;
  /** Primary 1:1 peer ID (null for circle rooms). */
  peerId: string | null;
  scoreLabel: string | null;
  myName: string;
}) {
  const video = useRoomVideo(roomId);
  const {
    mediasoupStatus,
    mediasoupError,
    localMediaStream,
    remoteMediaStream,
    mainStageShowsScreen,
    remotePeerCameraStream,
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

  // Main stage label: prefer the matched peer, fall back to whoever is first in the RTC peer list.
  const primaryId = peerId ?? Object.keys(peers)[0] ?? null;
  const primaryPeer = primaryId ? peers[primaryId] : null;
  const peerLabel = primaryPeer?.displayName ?? (primaryId ? `Peer ${primaryId.slice(0, 8)}…` : "Peer");
  // Show initials when the peer has explicitly paused their camera (cameraActive === false).
  const remotePeerCameraOff = primaryPeer?.cameraActive === false;

  return (
    <div className="fixed inset-0 z-100 flex flex-col overflow-hidden bg-background">
      <RoomVideoView
        onEnd={onEnd}
        onSkip={video.handleSkip}
        onMinimize={video.handleMinimize}
        localStream={localMediaStream}
        remoteStream={remoteMediaStream}
        mainStageShowsScreen={mainStageShowsScreen}
        remotePeerCameraStream={remotePeerCameraStream}
        mediaStatus={mediasoupStatus}
        mediaError={mediasoupError}
        micEnabled={micEnabled}
        cameraEnabled={cameraEnabled}
        onToggleMic={toggleMic}
        onToggleCamera={toggleCamera}
        rtcRoomType={rtcRoomType}
        screenSharing={screenSharing}
        onToggleScreenShare={toggleScreenShare}
        localMediaDeviceError={localMediaDeviceError}
        onDismissLocalMediaDeviceError={clearLocalMediaDeviceError}
        peerLabel={peerLabel}
        scoreLabel={scoreLabel}
        myName={myName}
        remotePeerCameraOff={remotePeerCameraOff}
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

  const { roomId, loading, error, peerId, score, currentUserName, goHome, leaveAndGoHome } = useRoom();

  const myName = currentUserName ?? "You";
  const scoreLabel =
    score != null && String(score).length > 0 ? `${String(score)}% match` : null;

  // Auto-start video as soon as the peer is connected
  useEffect(() => {
    if (peerId && !sessionActive) {
      markRoomActive();
      dispatch(startVideoSession({ roomId, primaryRemoteUserId: peerId ?? null }));
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
    return (
      <RoomVideoLayer
        roomId={roomId}
        onEnd={handleEnd}
        peerId={peerId}
        scoreLabel={scoreLabel}
        myName={myName}
      />
    );
  }

  // Minimized state — the floating dock handles UI; render nothing here
  return null;
}
