"use client";

import { useState } from "react";
import { MOCK_MATCH } from "@/features/room/constants/mock-match";
import { DIRECT_ROOM_ACTIVITIES } from "@/features/room/constants/direct-room-activities";
import { useRoomVideoViewModel } from "@/features/room/hooks/use-room-video-view-model";
import type { RoomVideoViewProps } from "@/features/room/types/room-video-view.types";
import type { RoomActivityId } from "@/features/room/types/room-activity.types";
import { RoomVideoStage } from "@/features/room/components/room-video/room-video-stage";
import { RoomVideoHud } from "@/features/room/components/room-video/room-video-hud";
import { RoomVideoToolbar } from "@/features/room/components/room-video/room-video-toolbar";
import { RoomVideoStageOverlays } from "@/features/room/components/room-video/room-video-overlays";
import { RoomVideoRightPanel } from "@/features/room/components/room-video/room-video-right-panel";

export type { RoomVideoViewProps } from "@/features/room/types/room-video-view.types";

type RightPanelTab = "chat" | "activities";
type StageRatio = "16:9" | "1:1";

export function RoomVideoView({
  onEnd,
  onSkip,
  onMinimize,
  localStream = null,
  remoteStream = null,
  mainStageShowsScreen = false,
  remotePeerCameraStream = null,
  mediaStatus = "idle",
  mediaError = null,
  peerLabel = MOCK_MATCH.name,
  scoreLabel = null,
  micEnabled = true,
  cameraEnabled = true,
  onToggleMic,
  onToggleCamera,
  rtcRoomType = null,
  screenSharing = false,
  onToggleScreenShare,
  localMediaDeviceError = null,
  onDismissLocalMediaDeviceError,
  myName = "You",
  currentUserId = null,
  myAvatarUrl = null,
  peerAvatarUrl = null,
  remotePeerCameraOff = false,
  isGroupRoom = false,
  remoteParticipants = [],
  remotePeers = {},
  showSkip = true,
  conversationId = null,
  showAddToCircle = false,
  onOpenAddToCircle,
  searchingForNextCandidate = false,
  activeRealtimeActivity = null,
  onRequestChessInvite,
  requestChessBusy = false,
  onEndActiveGame,
}: RoomVideoViewProps) {
  const [rightPanelTab, setRightPanelTab] = useState<RightPanelTab>("chat");
  const [activeActivity, setActiveActivity] = useState<RoomActivityId | null>(null);
  const [stageRatio, setStageRatio] = useState<StageRatio>(() =>
    isGroupRoom ? "16:9" : "1:1"
  );
  const [isLive, setIsLive] = useState(false);
  const {
    remoteVideoRef,
    peerCameraInsetRef,
    localVideoRef,
    remoteVideoLive,
    remoteMediaLive,
    localVideoLive,
    peerCameraInsetStream,
    peerCameraInsetLive,
    peerInitials,
    groupGalleryParticipants,
    mediaTogglesReady,
    showScreenShare,
    mediaBusy,
    elapsed,
    formatDuration,
  } = useRoomVideoViewModel({
    remoteStream,
    remotePeerCameraOff,
    localStream,
    mainStageShowsScreen,
    remotePeerCameraStream,
    isGroupRoom,
    remotePeers,
    remoteParticipants,
    mediaStatus,
    rtcRoomType,
    peerLabel,
    onToggleMic,
    onToggleCamera,
    onToggleScreenShare,
  });
  const activeChess = activeRealtimeActivity?.kind === "chess";
  const stageActivity = activeChess ? "chess" : activeActivity;
  const activeActivityMeta =
    DIRECT_ROOM_ACTIVITIES.find((activity) => activity.id === stageActivity) ?? null;
  const myInitial = myName.charAt(0).toUpperCase();
  const isOneToOneStage = !isGroupRoom && !stageActivity && stageRatio === "1:1";
  const showSearchingState = !isGroupRoom && searchingForNextCandidate;
  const activeActivityLabel = activeActivityMeta ? `${activeActivityMeta.label} activity` : null;

  return (
    <div className="flex h-full min-h-0 w-full min-w-0 overflow-hidden bg-background">
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: `linear-gradient(135deg, ${MOCK_MATCH.gradFrom}14, var(--background) 40%, ${MOCK_MATCH.gradTo}10)`,
        }}
      />

      <div className="relative flex min-h-0 flex-1 flex-col gap-2 p-2 md:gap-3 md:p-3 lg:flex-row">
        <div className="relative flex min-h-0 min-w-0 h-[56vh] flex-1 flex-col overflow-hidden rounded-2xl bg-black/60 shadow-xl sm:h-[62vh] lg:h-auto">
          <RoomVideoStage
            isGroupRoom={isGroupRoom}
            groupGalleryParticipants={groupGalleryParticipants}
            remoteVideoRef={remoteVideoRef}
            localVideoRef={localVideoRef}
            showSearchingState={showSearchingState}
            stageRatio={stageRatio}
            activeActivity={activeActivity}
            activeActivityMeta={activeActivityMeta}
            setActiveActivity={setActiveActivity}
            activeRealtimeActivity={activeRealtimeActivity}
            onEndActiveGame={onEndActiveGame}
            remoteVideoLive={remoteVideoLive}
            localVideoLive={localVideoLive}
            remoteStream={remoteStream}
            localStream={localStream}
            mainStageShowsScreen={mainStageShowsScreen}
            peerLabel={peerLabel}
            peerInitials={peerInitials}
            myName={myName}
            currentUserId={currentUserId}
            myInitial={myInitial}
            peerAvatarUrl={peerAvatarUrl}
            myAvatarUrl={myAvatarUrl}
          />

          <RoomVideoStageOverlays
            mediaBusy={mediaBusy}
            mediaStatus={mediaStatus}
            mediaError={mediaError}
            localMediaDeviceError={localMediaDeviceError}
            onDismissLocalMediaDeviceError={onDismissLocalMediaDeviceError}
            isGroupRoom={isGroupRoom}
            activeActivity={Boolean(stageActivity)}
            stageRatio={stageRatio}
            localVideoLive={localVideoLive}
            localVideoRef={localVideoRef}
            myName={myName}
            myInitial={myInitial}
            myAvatarUrl={myAvatarUrl}
            mainStageShowsScreen={mainStageShowsScreen}
            peerCameraInsetStream={peerCameraInsetStream}
            peerCameraInsetLive={peerCameraInsetLive}
            peerCameraInsetRef={peerCameraInsetRef}
            peerLabel={peerLabel}
            peerInitials={peerInitials}
            peerAvatarUrl={peerAvatarUrl}
            scoreLabel={scoreLabel}
          />

          <RoomVideoHud
            isOneToOneStage={isOneToOneStage}
            isGroupRoom={isGroupRoom}
            activeActivityLabel={activeActivityLabel}
            activeActivity={Boolean(stageActivity)}
            mainStageShowsScreen={mainStageShowsScreen}
            peerLabel={peerLabel}
            stageRatio={stageRatio}
            setStageRatio={setStageRatio}
            onMinimize={onMinimize}
          />

          <RoomVideoToolbar
            onToggleMic={onToggleMic}
            onToggleCamera={onToggleCamera}
            micEnabled={micEnabled}
            cameraEnabled={cameraEnabled}
            mediaTogglesReady={mediaTogglesReady}
            showScreenShare={showScreenShare}
            screenSharing={screenSharing}
            onToggleScreenShare={onToggleScreenShare}
            conversationId={conversationId}
            rightPanelTab={rightPanelTab}
            setRightPanelTab={setRightPanelTab}
            isGroupRoom={isGroupRoom}
            isLive={isLive}
            setIsLive={setIsLive}
            showAddToCircle={showAddToCircle}
            onOpenAddToCircle={onOpenAddToCircle}
            showSkip={showSkip}
            onSkip={onSkip}
            onEnd={onEnd}
            elapsed={elapsed}
            formatDuration={formatDuration}
          />
        </div>

        <RoomVideoRightPanel
          rightPanelTab={rightPanelTab}
          setRightPanelTab={setRightPanelTab}
          isGroupRoom={isGroupRoom}
          isLive={isLive}
          conversationId={conversationId}
          activeActivity={activeActivity}
          setActiveActivity={setActiveActivity}
          activeRealtimeActivity={activeRealtimeActivity}
          onRequestChessInvite={onRequestChessInvite}
          requestChessBusy={requestChessBusy}
        />
      </div>
    </div>
  );
}