"use client";

import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
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

function useLgBreakpoint() {
  const [lgUp, setLgUp] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px)");
    const apply = () => setLgUp(mq.matches);
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);
  return lgUp;
}

/** Tailwind `md` — direct rooms lock to 1:1 layout below this width */
const MD_DOWN_MQ = "(max-width: 767px)";

function subscribeMdDown(onChange: () => void) {
  const mq = window.matchMedia(MD_DOWN_MQ);
  mq.addEventListener("change", onChange);
  return () => mq.removeEventListener("change", onChange);
}

function snapshotMdDown() {
  return window.matchMedia(MD_DOWN_MQ).matches;
}

function snapshotMdDownServer() {
  return false;
}

/** Video stage + HUD + toolbar; chat as dock (lg) or sheet (narrow). */
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
  onOfferDrawGame,
}: RoomVideoViewProps) {
  const lgUp = useLgBreakpoint();
  const mdDown = useSyncExternalStore(subscribeMdDown, snapshotMdDown, snapshotMdDownServer);
  const [rightPanelTab, setRightPanelTab] = useState<RightPanelTab>("chat");
  const [mobileChatSheetOpen, setMobileChatSheetOpen] = useState(false);
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
  const showDirectAspectRatioToggle =
    !isGroupRoom && !Boolean(stageActivity) && !mdDown;

  useEffect(() => {
    if (!isGroupRoom && mdDown && stageRatio === "16:9") {
      setStageRatio("1:1");
    }
  }, [isGroupRoom, mdDown, stageRatio]);

  useEffect(() => {
    if (lgUp) setMobileChatSheetOpen(false);
  }, [lgUp]);

  const selectRightPanelTab = useCallback(
    (tab: RightPanelTab) => {
      setRightPanelTab(tab);
      if (!lgUp) {
        /* Toolbar stays focused for part of the click frame; Radix then sets aria-hidden on RoomVideoLayer (z-100) and Chrome blocks it if focus is still inside. Blur, then open on the next paint. */
        (document.activeElement as HTMLElement | null)?.blur();
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            setMobileChatSheetOpen(true);
          });
        });
      }
    },
    [lgUp],
  );

  const rightPanelProps = {
    rightPanelTab,
    setRightPanelTab,
    isGroupRoom,
    isLive,
    conversationId,
    activeActivity,
    setActiveActivity,
    activeRealtimeActivity,
    onRequestChessInvite,
    requestChessBusy,
  };

  const videoToolbarProps = {
    onToggleMic,
    onToggleCamera,
    micEnabled,
    cameraEnabled,
    mediaTogglesReady,
    showScreenShare,
    screenSharing,
    onToggleScreenShare,
    conversationId,
    rightPanelTab,
    setRightPanelTab: selectRightPanelTab,
    isGroupRoom,
    isLive,
    setIsLive,
    showAddToCircle,
    onOpenAddToCircle,
    showSkip,
    onSkip,
    onEnd,
    elapsed,
    formatDuration,
  };

  return (
    <div className="flex h-full min-h-0 w-full min-w-0 overflow-hidden bg-background">
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: `linear-gradient(135deg, ${MOCK_MATCH.gradFrom}14, var(--background) 40%, ${MOCK_MATCH.gradTo}10)`,
        }}
      />

      <div className="relative flex min-h-0 min-w-0 flex-1 flex-col gap-2 p-2 md:gap-3 md:p-3">
        <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-2 overflow-hidden lg:flex-row lg:items-stretch lg:gap-3">
          {/* Stage + toolbar share one column on lg so the footer is only as wide as the stage (not under chat). */}
          <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-2 lg:min-h-0">
            <div className="relative flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-2xl bg-black/60 shadow-xl">
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
                onOfferDrawGame={onOfferDrawGame}
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
                showAspectRatioToggle={showDirectAspectRatioToggle}
                onMinimize={onMinimize}
              />
            </div>

            <RoomVideoToolbar {...videoToolbarProps} />
          </div>

          <aside className="hidden min-h-0 w-full min-w-0 shrink-0 lg:flex lg:w-88 lg:flex-col">
            <RoomVideoRightPanel {...rightPanelProps} variant="dock" />
          </aside>
        </div>

        {!lgUp ? (
          <Dialog open={mobileChatSheetOpen} onOpenChange={setMobileChatSheetOpen}>
            <DialogContent
              showCloseButton
              aria-describedby={undefined}
              className={[
                /* Above RoomVideoLayer (`z-100`) and in-room dialogs (e.g. z-[200]) */
                "z-[250] gap-0 border-x-0 border-b-0 p-0",
                "fixed! inset-x-0! bottom-0! top-auto! left-0! right-0! max-h-[min(88dvh,880px)]! w-full! max-w-full!",
                "translate-x-0! translate-y-0! rounded-t-2xl rounded-b-none",
              ].join(" ")}
              overlayClassName="z-[240]"
            >
              <DialogTitle className="sr-only">Chat and activities</DialogTitle>
              <div className="flex max-h-[min(88dvh,880px)] flex-col overflow-hidden pb-[env(safe-area-inset-bottom)]">
                <RoomVideoRightPanel {...rightPanelProps} variant="sheet" />
              </div>
            </DialogContent>
          </Dialog>
        ) : null}
      </div>
    </div>
  );
}