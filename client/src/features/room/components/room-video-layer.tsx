"use client";

import { useRtcSocketContext } from "@/features/rtc";
import { RoomVideoView } from "@/features/room/components/room-video-view";
import { useRoomPeerChrome } from "@/features/room/hooks/use-room-peer-chrome";
import { useRoomVideo } from "@/features/room/hooks/use-room-video";

export type RoomVideoLayerProps = {
  roomId: string;
  onEnd: () => void;
  peerId: string | null;
  scoreLabel: string | null;
  myName: string;
  isGroupRoom: boolean;
  groupRoomTitle: string | null;
};

export function RoomVideoLayer({
  roomId,
  onEnd,
  peerId,
  scoreLabel,
  myName,
  isGroupRoom,
  groupRoomTitle,
}: RoomVideoLayerProps) {
  const video = useRoomVideo(roomId);
  const {
    mediasoupStatus,
    mediasoupError,
    localMediaStream,
    remoteMediaStream,
    mainStageShowsScreen,
    remotePeerCameraStream,
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

  const { peerLabel, remotePeerCameraOff } = useRoomPeerChrome({
    peerId,
    peers,
    isGroupRoom,
    groupRoomTitle,
  });

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
        remoteParticipants={remoteParticipants}
        remotePeers={peers}
        isGroupRoom={isGroupRoom}
        showSkip={!isGroupRoom}
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
