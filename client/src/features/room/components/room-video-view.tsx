"use client";

/**
 * RoomVideoView is the main in-call screen renderer for both direct and circle rooms.
 *
 * Purpose:
 * - Owns local UI state (right panel tab, stage ratio, active activity, mobile chat sheet).
 * - Narrow viewports: bottom sheet for chat/people/activities is vertically resizable via drag handle.
 * - Circle calls: footer “Options” opens `RoomCircleCallOptionsDialog` (rename, link, invite, chat).
 * - Delegates media-derived values to `useRoomVideoViewModel`.
 * - Composes stage, overlays, HUD, toolbar, and right panel into a single responsive call layout.
 *
 * This component should stay as a UI coordinator; transport/signaling logic belongs upstream.
 *
 * Screen share vs activities: toasts block overlapping actions (no auto-stop). Only one in-call
 * activity at a time: starting another requires ending the current one first (toasts + disabled tiles
 * for other activities). Screen share uses toasts only — activity tiles stay tappable.
 * Narrow + screen share: main stage shows share with cameras (direct: vertical stack; circle: 2×2 + pages).
 */
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { Maximize2, Minimize2, Volume2, VolumeX } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { MOCK_MATCH } from "@/features/room/constants/mock-match";
import { useRoomVideoViewModel } from "@/features/room/hooks/use-room-video-view-model";
import { useStageFullscreen } from "@/features/room/hooks/use-stage-fullscreen";
import type { RoomVideoViewProps } from "@/features/room/types/room-video-view.types";
import type { RoomActivityId } from "@/features/room/types/room-activity.types";
import type { RoomCallRightPanelTab } from "@/features/room/types/room-call-panel.types";
import { RoomCallParticipantsPanel } from "@/features/room/components/room-video/room-call-participants-panel";
import { RoomVideoStage } from "@/features/room/components/room-video/room-video-stage";
import { RoomCircleCallOptionsDialog } from "@/features/room/components/room-video/room-circle-call-options-dialog";
import { RoomVideoHud } from "@/features/room/components/room-video/room-video-hud";
import { RoomVideoToolbar } from "@/features/room/components/room-video/room-video-toolbar";
import { RoomVideoStageOverlays } from "@/features/room/components/room-video/room-video-overlays";
import { RoomMobileChatSheetDragHandle } from "@/features/room/components/room-video/room-mobile-chat-sheet-drag-handle";
import { RoomVideoRightPanel } from "@/features/room/components/room-video/room-video-right-panel";
import { useRoomMobileChatSheetHeight } from "@/features/room/hooks/use-room-mobile-chat-sheet-height";
import { cn } from "@/lib/utils";
import { buildLocalPreviewStream } from "@/features/rtc/lib/direct-call-stage";
import {
  resolveActivityMetaForStage,
  resolveEmbeddedActivityCallPolicy,
  shouldShowDirectCallActivitiesTab,
  shouldSuppressDuplicatePeopleCameras,
} from "@/features/room/embedded-activities";

export type { RoomVideoViewProps } from "@/features/room/types/room-video-view.types";

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

/** Tailwind `md` breakpoint (viewport narrower than `md`). */
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

/** True while the stream has at least one audio track that has not ended. */
function useRemoteStreamHasAudioTrack(stream: MediaStream | null): boolean {
  const subscribe = useCallback(
    (onStoreChange: () => void) => {
      if (!stream) return () => {};
      const trackEndHandlers = new Map<MediaStreamTrack, () => void>();
      const ensureTrackEndedListeners = () => {
        for (const t of stream.getAudioTracks()) {
          if (trackEndHandlers.has(t)) continue;
          const onEnd = () => onStoreChange();
          t.addEventListener("ended", onEnd);
          trackEndHandlers.set(t, onEnd);
        }
      };
      const onStreamTracksChange = () => {
        onStoreChange();
        ensureTrackEndedListeners();
      };
      onStreamTracksChange();
      stream.addEventListener("addtrack", onStreamTracksChange);
      stream.addEventListener("removetrack", onStreamTracksChange);
      return () => {
        stream.removeEventListener("addtrack", onStreamTracksChange);
        stream.removeEventListener("removetrack", onStreamTracksChange);
        trackEndHandlers.forEach((fn, t) => t.removeEventListener("ended", fn));
        trackEndHandlers.clear();
      };
    },
    [stream],
  );
  const getSnapshot = useCallback(
    () => Boolean(stream?.getAudioTracks().some((t) => t.readyState !== "ended")),
    [stream],
  );
  return useSyncExternalStore(subscribe, getSnapshot, () => false);
}

/** Video stage + HUD + toolbar; chat as dock (lg) or sheet (narrow). */
export function RoomVideoView({
  onEnd,
  onSkip,
  onMinimize,
  localStream = null,
  localCompositeStream = null,
  localScreenTrackId = null,
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
  remotePeerMicOff = false,
  isGroupRoom = false,
  remoteParticipants = [],
  remotePeers = {},
  showSkip = true,
  conversationId = null,
  showAddToCircle = false,
  onOpenAddToCircle,
  searchingForNextCandidate = false,
  directCallMatchSearchFailed = false,
  directCallMatchSearchError = null,
  onRetryDirectCallMatchSearch,
  activeRealtimeActivity = null,
  onRequestChessInvite,
  requestChessBusy = false,
  onEndActiveGame,
  onOfferDrawGame,
  roomId = null,
  circleDisplayTitle = null,
  circleCanEditTitle = false,
  screenShareTiles = [],
  focusedScreenShareKey = null,
  onSelectScreenShare,
  remoteTrackMediaSource = {},
  onEmbeddedStageActivityChange,
  directRoomActivities: directRoomActivitiesProp,
  embeddedCallPolicyLookup = null,
}: RoomVideoViewProps) {
  /** `is_active` catalog tiles from `RoomVideoLayer` (empty until loaded or when none enabled). */
  const activeDirectRoomActivities = directRoomActivitiesProp ?? [];
  const showActivitiesTab = shouldShowDirectCallActivitiesTab(isGroupRoom, activeDirectRoomActivities);
  const lgUp = useLgBreakpoint();
  const mdDown = useSyncExternalStore(subscribeMdDown, snapshotMdDown, snapshotMdDownServer);
  const stageShellRef = useRef<HTMLDivElement>(null);
  const stageFullscreen = useStageFullscreen(stageShellRef);
  const [rightPanelTab, setRightPanelTab] = useState<RoomCallRightPanelTab>("chat");
  const prevShowPeopleTabRef = useRef(false);
  const [mobileChatSheetOpen, setMobileChatSheetOpen] = useState(false);
  const [activeActivity, setActiveActivity] = useState<RoomActivityId | null>(null);
  const [stageRatio, setStageRatio] = useState<StageRatio>(() =>
    isGroupRoom ? "16:9" : "1:1"
  );
  const [isLive, setIsLive] = useState(false);
  const [circleOptionsOpen, setCircleOptionsOpen] = useState(false);
  /** Per-screen-share-key local mute state for inbound audio. */
  const [screenShareAudioMutedByKey, setScreenShareAudioMutedByKey] = useState<Record<string, boolean>>({});
  const screenShareAudioMuted = focusedScreenShareKey
    ? (screenShareAudioMutedByKey[focusedScreenShareKey] ?? false)
    : false;

  const activeChess = activeRealtimeActivity?.kind === "chess";
  const stageActivity = activeChess ? "chess" : activeActivity;
  const hasActivityOnStage = Boolean(stageActivity);

  const embeddedCallPolicy = useMemo(
    () =>
      resolveEmbeddedActivityCallPolicy({
        stageActivityId: stageActivity,
        synchronizedActivity: activeRealtimeActivity ?? null,
        policyByActivity: embeddedCallPolicyLookup,
      }),
    [stageActivity, activeRealtimeActivity, embeddedCallPolicyLookup],
  );

  useEffect(() => {
    onEmbeddedStageActivityChange?.(stageActivity);
  }, [stageActivity, onEmbeddedStageActivityChange]);
  /** Local or remote share present — activities must not overlap the share stage. */
  const screenShareBlocksActivities =
    screenSharing || mainStageShowsScreen || screenShareTiles.length > 0;

  const handleToggleScreenShare = useCallback(() => {
    if (!screenSharing && hasActivityOnStage) {
      toast.info("Leave or end the current activity before sharing your screen.");
      return;
    }
    onToggleScreenShare?.();
  }, [screenSharing, hasActivityOnStage, onToggleScreenShare]);

  /** @returns whether the activity actually started (or already active); false = blocked, do not switch tabs. */
  const tryBeginEmbeddedActivity = useCallback(
    (activity: RoomActivityId): boolean => {
      if (screenShareBlocksActivities) {
        toast.info(
          screenSharing
            ? "Screen sharing should be off before starting this activity."
            : "Screen sharing is active in this call. Wait until it ends before starting this activity.",
        );
        return false;
      }
      if (hasActivityOnStage) {
        if (activeChess) {
          toast.info("End the chess game before starting another activity.");
          return false;
        }
        if (activeActivity === activity) {
          return true;
        }
        toast.info("End the current activity before starting another one.");
        return false;
      }
      setActiveActivity(activity);
      return true;
    },
    [
      screenShareBlocksActivities,
      screenSharing,
      hasActivityOnStage,
      activeChess,
      activeActivity,
    ],
  );

  /** @returns false if invite was blocked (e.g. still screen sharing). */
  const tryRequestChessInvite = useCallback((): boolean => {
    if (screenShareBlocksActivities) {
      toast.info(
        screenSharing
          ? "Screen sharing should be off before starting chess."
          : "Screen sharing is active in this call. Wait until it ends before starting chess.",
      );
      return false;
    }
    if (hasActivityOnStage) {
      if (activeChess) {
        toast.info("A chess game is already in progress.");
        return false;
      }
      toast.info("End the current activity before starting chess.");
      return false;
    }
    onRequestChessInvite?.();
    return true;
  }, [screenShareBlocksActivities, screenSharing, hasActivityOnStage, activeChess, onRequestChessInvite]);

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
    screenShareMainLayout,
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
    screenShareTiles,
    remoteTrackMediaSource,
  });
  /** Screen-share UI: stage may go full-bleed and the panel lists shares + cameras. */
  const showScreenShareContext =
    showScreenShare && (screenSharing || mainStageShowsScreen || screenShareTiles.length > 0);
  /**
   * During screen share, desktop/tablet (md+) keeps the stage full-bleed and puts cameras in the
   * People panel. Below `md`, participants stay on the main stage (stacked with share for direct
   * calls; 2×2 grid under share for circles) so users are not forced into the People tab.
   */
  const participantVideosInSidebar = Boolean(showScreenShareContext && !mdDown);
  const showStageFullscreenControl =
    showScreenShare && (screenSharing || mainStageShowsScreen || screenShareTiles.length > 0);
  const screenShareRemoteStreamForAudio = mainStageShowsScreen ? remoteStream : null;
  const remoteScreenShareHasLiveAudio = useRemoteStreamHasAudioTrack(screenShareRemoteStreamForAudio);
  /** `mainStageShowsScreen` is authoritative (SFU + layout); do not infer from track labels — those are often blank on receivers. */
  const showScreenShareAudioButton =
    Boolean(mainStageShowsScreen) && remoteScreenShareHasLiveAudio;
  /** Narrow + share with on-stage cameras: expand/fill should zoom the share only (see `RoomVideoStage`). */
  const shareStageImmersive =
    stageFullscreen.isExpanded && showScreenShareContext && !participantVideosInSidebar;
  /**
   * People tab: screen share roster, or embedded activity that keeps roster in the side panel.
   * Policy-driven (e.g. chess) can hide it when cameras only live in the activity shell.
   */
  const showPeopleTab =
    !embeddedCallPolicy.hidePeopleTab && (showScreenShareContext || hasActivityOnStage);

  const activeActivityMeta = resolveActivityMetaForStage(stageActivity, activeDirectRoomActivities);
  const myInitial = myName.charAt(0).toUpperCase();
  /**
   * Camera-only direct HUD: no share chrome. On `lg+` desktop, screen sharing uses 16:9; on mobile/tablet
   * the stage stays 1:1 even during share (see stage-ratio effect).
   */
  const isOneToOneStage = !isGroupRoom && !stageActivity && !showScreenShareContext;
  const showSearchingState = !isGroupRoom && searchingForNextCandidate;
  const retryDirectMatch =
    onRetryDirectCallMatchSearch ?? (() => {});
  const activeActivityLabel = activeActivityMeta ? `${activeActivityMeta.label} activity` : null;

  /** Circle route always has `roomId` when `isGroupRoom`; narrows types for options UI. */
  const circleRoomId = isGroupRoom && roomId ? roomId : null;
  const circleTitle = circleDisplayTitle?.trim() || "Circle";

  useEffect(() => {
    if (isGroupRoom) return;
    /* Mobile + tablet (`lg` breakpoint): always 1:1. Desktop: 16:9 only while screen sharing. */
    if (!lgUp) {
      if (stageRatio !== "1:1") setStageRatio("1:1");
      return;
    }
    if (showScreenShareContext) {
      if (stageRatio !== "16:9") setStageRatio("16:9");
    } else if (stageRatio !== "1:1") {
      setStageRatio("1:1");
    }
  }, [isGroupRoom, lgUp, showScreenShareContext, stageRatio]);

  useEffect(() => {
    if (!mainStageShowsScreen) setScreenShareAudioMutedByKey({});
  }, [mainStageShowsScreen]);

  useEffect(() => {
    if (!showScreenShareAudioButton) setScreenShareAudioMutedByKey({});
  }, [showScreenShareAudioButton]);

  useEffect(() => {
    if (!remoteStream) return;
    remoteStream.getAudioTracks().forEach((t) => {
      t.enabled = !screenShareAudioMuted;
    });
  }, [screenShareAudioMuted, remoteStream]);

  useEffect(() => {
    if (lgUp) setMobileChatSheetOpen(false);
  }, [lgUp]);

  const mobileChatSheetDrag = useRoomMobileChatSheetHeight(mobileChatSheetOpen && !lgUp);

  useEffect(() => {
    if (rightPanelTab === "participants" && !showPeopleTab) {
      setRightPanelTab("chat");
    }
  }, [rightPanelTab, showPeopleTab]);

  useEffect(() => {
    if (rightPanelTab === "activities" && !showActivitiesTab) {
      setRightPanelTab("chat");
    }
  }, [rightPanelTab, showActivitiesTab]);

  useEffect(() => {
    if (showPeopleTab && !prevShowPeopleTabRef.current && !mdDown) {
      setRightPanelTab("participants");
    }
    prevShowPeopleTabRef.current = showPeopleTab;
  }, [showPeopleTab, mdDown]);

  useEffect(() => {
    return () => {
      void stageFullscreen.exit();
    };
    // Unmount-only cleanup; `exit` is stable from `useStageFullscreen`.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentionally only `exit`
  }, [stageFullscreen.exit]);

  // People tab “You”: camera+audio only while sharing; recompute when shares change so the stream re-attaches.
  const localStreamPeopleTabSelf = useMemo(() => {
    if (!screenSharing || !localCompositeStream || !localScreenTrackId) {
      return localStream;
    }
    return buildLocalPreviewStream(localCompositeStream, localScreenTrackId) ?? localStream;
  }, [screenSharing, localCompositeStream, localScreenTrackId, localStream]);

  const selectRightPanelTab = useCallback(
    (tab: RoomCallRightPanelTab) => {
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

  const suppressPeoplePanelCameras = shouldSuppressDuplicatePeopleCameras({
    isGroupRoom,
    hasActivityOnStage,
    stageActivityId: stageActivity,
    mergedPolicy: embeddedCallPolicy,
  });

  const participantsPanel = showPeopleTab ? (
    <RoomCallParticipantsPanel
      isGroupRoom={isGroupRoom}
      myName={myName}
      myAvatarUrl={myAvatarUrl}
      micEnabled={micEnabled}
      cameraEnabled={cameraEnabled}
      screenSharing={screenSharing}
      remotePeers={remotePeers}
      directPeerLabel={peerLabel}
      directPeerAvatarUrl={peerAvatarUrl}
      remotePeerMicOff={remotePeerMicOff}
      remotePeerCameraOff={remotePeerCameraOff}
      screenShareTiles={screenShareTiles}
      focusedScreenShareKey={focusedScreenShareKey ?? null}
      onSelectScreenShare={onSelectScreenShare}
      groupGalleryParticipants={groupGalleryParticipants}
      localStream={localStreamPeopleTabSelf}
      remotePeerCameraStream={remotePeerCameraStream}
      suppressCameraTiles={suppressPeoplePanelCameras}
    />
  ) : null;

  const rightPanelProps = {
    rightPanelTab,
    setRightPanelTab,
    isGroupRoom,
    isLive,
    conversationId,
    searchingForNextCandidate: showSearchingState,
    activeActivity,
    setActiveActivity: tryBeginEmbeddedActivity,
    activeRealtimeActivity,
    onRequestChessInvite: tryRequestChessInvite,
    requestChessBusy,
    showPeopleTab,
    showActivitiesTab,
    participantsPanel,
    stageActivity,
    directRoomActivities: activeDirectRoomActivities,
  };

  const videoToolbarProps = {
    onToggleMic,
    onToggleCamera,
    micEnabled,
    cameraEnabled,
    mediaTogglesReady,
    showScreenShare,
    screenSharing,
    onToggleScreenShare: handleToggleScreenShare,
    conversationId,
    rightPanelTab,
    setRightPanelTab: selectRightPanelTab,
    isGroupRoom,
    isLive,
    setIsLive,
    showAddToCircle,
    onOpenAddToCircle,
    showCircleOptions: Boolean(circleRoomId),
    onOpenCircleOptions: circleRoomId ? () => setCircleOptionsOpen(true) : undefined,
    showSkip,
    onSkip,
    onEnd,
    elapsed,
    formatDuration,
    showPeopleTab,
    showActivitiesTab,
  };

  const openCircleChat = useCallback(() => {
    selectRightPanelTab("chat");
  }, [selectRightPanelTab]);

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
            <div
              ref={stageShellRef}
              className={cn(
                "relative flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-2xl bg-black/60 shadow-xl",
                stageFullscreen.isLayoutImmersive &&
                  "fixed inset-0 z-[300] m-0 max-h-[100dvh] rounded-none shadow-none",
              )}
            >
              <div className="relative min-h-0 min-w-0 flex-1 overflow-hidden">
                {showStageFullscreenControl || showScreenShareAudioButton ? (
                  <div className="pointer-events-none absolute inset-x-0 top-0 z-20 flex justify-end p-3 pt-[max(0.75rem,env(safe-area-inset-top))]">
                    <div className="pointer-events-auto flex shrink-0 items-center gap-2">
                      {showStageFullscreenControl ? (
                        <button
                          type="button"
                          onClick={() => void stageFullscreen.toggle()}
                          aria-label={
                            stageFullscreen.isExpanded ? "Exit full screen" : "Full screen"
                          }
                          title={stageFullscreen.isExpanded ? "Exit full screen" : "Full screen"}
                          className="inline-flex size-10 cursor-pointer items-center justify-center rounded-full border border-white/25 bg-black/55 text-white shadow-lg backdrop-blur-md transition-colors hover:bg-black/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
                        >
                          {stageFullscreen.isExpanded ? (
                            <Minimize2 size={18} className="shrink-0" />
                          ) : (
                            <Maximize2 size={18} className="shrink-0" />
                          )}
                        </button>
                      ) : null}
                      {showScreenShareAudioButton ? (
                        <button
                          type="button"
                          onClick={() => {
                            if (!focusedScreenShareKey) return;
                            setScreenShareAudioMutedByKey((prev) => ({
                              ...prev,
                              [focusedScreenShareKey]: !(prev[focusedScreenShareKey] ?? false),
                            }));
                          }}
                          aria-label={
                            screenShareAudioMuted ? "Unmute screen audio" : "Mute screen audio"
                          }
                          title={
                            screenShareAudioMuted ? "Unmute screen audio" : "Mute screen audio"
                          }
                          className="inline-flex size-10 cursor-pointer items-center justify-center rounded-full border border-white/25 bg-black/55 text-white shadow-lg backdrop-blur-md transition-colors hover:bg-black/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
                        >
                          {screenShareAudioMuted ? (
                            <VolumeX size={18} className="shrink-0" />
                          ) : (
                            <Volume2 size={18} className="shrink-0" />
                          )}
                        </button>
                      ) : null}
                    </div>
                  </div>
                ) : null}
                <RoomVideoStage
                  isGroupRoom={isGroupRoom}
                  groupGalleryParticipants={groupGalleryParticipants}
                  remoteVideoRef={remoteVideoRef}
                  localVideoRef={localVideoRef}
                  showSearchingState={showSearchingState}
                  directCallMatchSearchFailed={directCallMatchSearchFailed}
                  directCallMatchSearchError={directCallMatchSearchError}
                  onRetryDirectCallMatchSearch={retryDirectMatch}
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
                  micEnabled={micEnabled}
                  cameraEnabled={cameraEnabled}
                  remoteCameraOff={remotePeerCameraOff}
                  remoteMicOff={remotePeerMicOff}
                  screenShareMainLayout={screenShareMainLayout}
                  screenShareTiles={screenShareTiles}
                  focusedScreenShareKey={focusedScreenShareKey}
                  onSelectScreenShare={onSelectScreenShare}
                  remotePeerCameraStream={remotePeerCameraStream}
                  participantVideosInSidebar={participantVideosInSidebar}
                  shareStageImmersive={shareStageImmersive}
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
                  micEnabled={micEnabled}
                  cameraEnabled={cameraEnabled}
                  localStream={localStream}
                  participantVideosInSidebar={participantVideosInSidebar}
                  shareStageImmersive={shareStageImmersive}
                />

                {!isGroupRoom ? (
                  <RoomVideoHud
                    isOneToOneStage={isOneToOneStage}
                    activeActivityLabel={activeActivityLabel}
                    activeActivity={Boolean(stageActivity)}
                    mainStageShowsScreen={mainStageShowsScreen}
                    peerLabel={peerLabel}
                    onMinimize={onMinimize}
                  />
                ) : null}
              </div>
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
                /* Above RoomVideoLayer (`z-100`) and in-room dialogs (e.g. `z-200`). */
                "z-250 gap-0 border-x-0 border-b-0 p-0",
                "fixed! inset-x-0! bottom-0! top-auto! left-0! right-0! w-full! max-w-full!",
                "translate-x-0! translate-y-0! rounded-t-2xl rounded-b-none",
              ].join(" ")}
              style={{ maxHeight: mobileChatSheetDrag.maxHeightPx }}
              overlayClassName="z-240"
            >
              <DialogTitle className="sr-only">
                {showActivitiesTab ? "People, chat, and activities" : "People and chat"}
              </DialogTitle>
              <div
                className="flex min-h-0 flex-col overflow-hidden pb-[env(safe-area-inset-bottom)]"
                style={{ height: mobileChatSheetDrag.heightPx }}
              >
                <RoomMobileChatSheetDragHandle
                  isDragging={mobileChatSheetDrag.isDragging}
                  {...mobileChatSheetDrag.dragHandleProps}
                />
                <div
                  className={cn(
                    "flex min-h-0 flex-1 touch-pan-y flex-col overflow-hidden",
                    mobileChatSheetDrag.isDragging && "touch-none select-none",
                  )}
                  {...mobileChatSheetDrag.sheetContentDragProps}
                >
                  <RoomVideoRightPanel {...rightPanelProps} variant="sheet" />
                </div>
              </div>
            </DialogContent>
          </Dialog>
        ) : null}

        {circleRoomId ? (
          <RoomCircleCallOptionsDialog
            open={circleOptionsOpen}
            onOpenChange={setCircleOptionsOpen}
            roomId={circleRoomId}
            displayTitle={circleTitle}
            canEdit={Boolean(circleCanEditTitle)}
            showInvite={showAddToCircle && Boolean(onOpenAddToCircle)}
            onInvite={onOpenAddToCircle}
            showChat={Boolean(conversationId)}
            onOpenChat={conversationId ? openCircleChat : undefined}
          />
        ) : null}
      </div>
    </div>
  );
}