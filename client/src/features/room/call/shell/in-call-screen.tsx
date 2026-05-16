"use client";

/**
 * InCallScreen is the main in-call screen renderer for both direct and circle rooms.
 *
 * Purpose:
 * - Owns local UI state (right panel tab, stage ratio, active activity, mobile chat sheet).
 * - Narrow viewports: bottom sheet for chat/people/activities is vertically resizable via drag handle.
 * - Circle calls: footer “Options” opens invite/link/chat; stage edit icon opens rename dialog.
 * - Delegates media-derived values to `useCallDisplayData`.
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
import { DEFAULT_CIRCLE_DISPLAY_TITLE } from "@/features/room/constants/call/circle-display";
import {
  IN_CALL_DIALOG_CONTENT_Z,
  IN_CALL_DIALOG_OVERLAY_Z,
} from "@/features/room/constants/call/in-call-dialog-layer";
import { MOCK_MATCH } from "@/features/room/constants/dev/mock-match";
import { useCallDisplayData } from "@/features/room/hooks/media/use-call-display-data";
import { useStageFullscreen } from "@/features/room/hooks/call-ui/use-stage-fullscreen";
import type { InCallScreenProps } from "@/features/room/types/call/in-call-screen.types";
import type { RoomActivityId } from "@/features/room/types/call/room-activity.types";
import type { RoomCallRightPanelTab } from "@/features/room/types/call/room-call-panel.types";
import { RoomCallParticipantsPanel } from "@/features/room/call/panels/sidebar/people-panel";
import { MainStage } from "@/features/room/call/stage/main-stage";
import { RoomCircleCallOptionsDialog } from "@/features/room/call/panels/circle-options/circle-call-options-dialog";
import { CircleRenameDialog } from "@/features/room/call/panels/circle-options/circle-rename-dialog";
import {
  CallTopBar,
  CALL_STAGE_CHROME_BTN_CLASS,
} from "@/features/room/call/stage/top-bar";
import { RoomVideoToolbar } from "@/features/room/call/toolbar/call-toolbar";
import { StageOverlays } from "@/features/room/call/stage/stage-overlays";
import { RoomMobileChatSheetDragHandle } from "@/features/room/call/panels/mobile/mobile-chat-drag-handle";
import { RightSidebar } from "@/features/room/call/panels/sidebar/right-sidebar";
import {
  roomMobileChatSheetLayoutCssVars,
  useRoomMobileChatSheetHeight,
} from "@/features/room/hooks/call-ui/use-room-mobile-chat-sheet-height";
import { useRoomRightPanelTab } from "@/features/room/hooks/call-ui/use-room-right-panel-tab";
import { cn } from "@/lib/utils";
import { buildLocalPreviewStream } from "@/features/rtc/lib/direct-call-stage";
import {
  resolveActivityMetaForStage,
  resolveEmbeddedActivityCallPolicy,
  shouldShowDirectCallActivitiesTab,
  shouldSuppressDuplicatePeopleCameras,
} from "@/features/room/embedded-activities";

export type { InCallScreenProps } from "@/features/room/types/call/in-call-screen.types";

type StageRatio = "16:9" | "1:1";

/** Tailwind `xl` — docked right panel + 16:9 share mode; below this, full-width stacked stage (iPad Pro portrait is 1024px). */
function useXlBreakpoint() {
  const [xlUp, setXlUp] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1280px)");
    const apply = () => setXlUp(mq.matches);
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);
  return xlUp;
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
export function InCallScreen({
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
  liveSpeakerPeerId = null,
  liveSpeakerSpeakingMs = {},
  onHostEndCircleForEveryone,
  callCapabilities: callCapabilitiesProp,
}: InCallScreenProps) {
  /** `is_active` catalog tiles from `InCallContainer` (empty until loaded or when none enabled). */
  const activeDirectRoomActivities = directRoomActivitiesProp ?? [];
  const showActivitiesTab =
    callCapabilitiesProp?.showActivitiesTab ??
    shouldShowDirectCallActivitiesTab(isGroupRoom, activeDirectRoomActivities);
  const xlUp = useXlBreakpoint();

  const mdDown = useSyncExternalStore(subscribeMdDown, snapshotMdDown, snapshotMdDownServer);
  const stageShellRef = useRef<HTMLDivElement>(null);
  const stageFullscreen = useStageFullscreen(stageShellRef);
  const [mobileChatSheetOpen, setMobileChatSheetOpen] = useState(false);
  const [activeActivity, setActiveActivity] = useState<RoomActivityId | null>(null);
  const [stageRatio, setStageRatio] = useState<StageRatio>(() =>
    isGroupRoom ? "16:9" : "1:1"
  );
  const [isLive, setIsLive] = useState(false);
  const [circleOptionsOpen, setCircleOptionsOpen] = useState(false);
  const [circleRenameOpen, setCircleRenameOpen] = useState(false);
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
  const screenShareActiveInCall =
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
      if (screenShareActiveInCall) {
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
      screenShareActiveInCall,
      screenSharing,
      hasActivityOnStage,
      activeChess,
      activeActivity,
    ],
  );

  /** @returns false if invite was blocked (e.g. still screen sharing). */
  const tryRequestChessInvite = useCallback((): boolean => {
    if (screenShareActiveInCall) {
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
  }, [screenShareActiveInCall, screenSharing, hasActivityOnStage, activeChess, onRequestChessInvite]);

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
  } = useCallDisplayData({
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
  const showScreenShareContext = showScreenShare && screenShareActiveInCall;
  /**
   * During screen share, `xl+` keeps a wide 16:9 stage and puts cameras in the People panel. Below
   * `xl`, participants stay on the main stage (stacked with share for direct
   * calls; 2×2 grid under share for circles) so users are not forced into the People tab.
   */
  const participantVideosInSidebar = false;
  const showStageFullscreenControl = showScreenShareContext;
  const screenShareRemoteStreamForAudio = mainStageShowsScreen ? remoteStream : null;
  const remoteScreenShareHasLiveAudio = useRemoteStreamHasAudioTrack(screenShareRemoteStreamForAudio);
  /** `mainStageShowsScreen` is authoritative (SFU + layout); do not infer from track labels — those are often blank on receivers. */
  const showScreenShareAudioButton =
    Boolean(mainStageShowsScreen) && remoteScreenShareHasLiveAudio;
  /** Narrow + share with on-stage cameras: expand/fill should zoom the share only (see `MainStage`). */
  const shareStageImmersive =
    stageFullscreen.isExpanded && showScreenShareContext && !participantVideosInSidebar;
  /**
   * People tab: screen share roster, or embedded activity that keeps roster in the side panel.
   * Policy-driven (e.g. chess) can hide it when cameras only live in the activity shell.
   */
  /** People tab only during screen share or an on-stage activity — not plain 1:1 cameras. */
  const showPeopleTab =
    callCapabilitiesProp?.showPeopleTab ??
    (!embeddedCallPolicy.hidePeopleTab && (showScreenShareContext || hasActivityOnStage));

  const activeActivityMeta = resolveActivityMetaForStage(stageActivity, activeDirectRoomActivities);
  const myInitial = myName.charAt(0).toUpperCase();
  /**
   * Camera-only direct HUD: no share chrome. At `xl+`, screen sharing uses 16:9 + docked panel; below
   * `xl` the stage stays 1:1 with stacked share + cameras (e.g. iPad Pro portrait).
   */
  const isOneToOneStage = !isGroupRoom && !stageActivity && !showScreenShareContext;
  const showSearchingState = !isGroupRoom && searchingForNextCandidate;
  /** Single local tile: no remote in roster yet, or matchmaking for a replacement (not the error state). */
  const directSoloLayout =
    !isGroupRoom &&
    !(searchingForNextCandidate && directCallMatchSearchFailed) &&
    (searchingForNextCandidate || Object.keys(remotePeers).length === 0);
  const retryDirectMatch =
    onRetryDirectCallMatchSearch ?? (() => {});
  const activeActivityLabel = activeActivityMeta ? `${activeActivityMeta.label} activity` : null;

  /** Circle route always has `roomId` when `isGroupRoom`; narrows types for options UI. */
  const circleRoomId = isGroupRoom && roomId ? roomId : null;
  const circleTitle = circleDisplayTitle?.trim() || DEFAULT_CIRCLE_DISPLAY_TITLE;

  useEffect(() => {
    if (isGroupRoom) return;
    /* Below `xl`: stacked stage + 1:1 share layout. At `xl+`: 16:9 share + docked panel. */
    if (!xlUp) {
      if (stageRatio !== "1:1") setStageRatio("1:1");
      return;
    }
    if (showScreenShareContext) {
      if (stageRatio !== "16:9") setStageRatio("16:9");
    } else if (stageRatio !== "1:1") {
      setStageRatio("1:1");
    }
  }, [isGroupRoom, xlUp, showScreenShareContext, stageRatio]);

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
    if (xlUp) setMobileChatSheetOpen(false);
  }, [xlUp]);

  const mobileChatSheetDrag = useRoomMobileChatSheetHeight(mobileChatSheetOpen && !xlUp);

  const {
    tab: rightPanelTab,
    setTab: setRightPanelTab,
    surfacePeopleIfAvailable,
  } = useRoomRightPanelTab({ showPeopleTab, showActivitiesTab, xlUp });

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
      if (!xlUp) {
        /* Toolbar stays focused for part of the click frame; Radix then sets aria-hidden on InCallContainer (z-100) and Chrome blocks it if focus is still inside. Blur, then open on the next paint. */
        (document.activeElement as HTMLElement | null)?.blur();
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            setMobileChatSheetOpen(true);
          });
        });
      }
    },
    [xlUp, setRightPanelTab],
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
      currentUserId={currentUserId ?? null}
      liveSpeakerPeerId={liveSpeakerPeerId}
      liveSpeakerSpeakingMs={liveSpeakerSpeakingMs}
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
    onHostEndCircleForEveryone,
  };

  const openCircleChat = useCallback(() => {
    selectRightPanelTab("chat");
  }, [selectRightPanelTab]);

  return (
    <div className="flex h-full min-h-0 w-full min-w-0 overflow-hidden bg-background">
      <div
        className="pointer-events-none absolute inset-0 bg-[linear-gradient(135deg,rgb(124_58_237/0.078),var(--background)_40%,rgb(79_70_229/0.063))]"
        aria-hidden
      />

      <div className="relative flex min-h-0 min-w-0 flex-1 flex-col gap-2 p-2 md:gap-3 md:p-3">
        <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-2 overflow-hidden xl:flex-row xl:items-stretch xl:gap-3">
          {/* Stage + toolbar share one column on xl so the footer is only as wide as the stage (not under chat). */}
          <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-2 xl:min-h-0">
            <div
              ref={stageShellRef}
              className={cn(
                "relative flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-2xl bg-black/60 shadow-xl",
                stageFullscreen.isLayoutImmersive &&
                  "fixed inset-0 z-300 m-0 max-h-dvh rounded-none shadow-none",
              )}
            >
              <div className="relative min-h-0 min-w-0 flex-1 overflow-hidden">
                <MainStage
                  isGroupRoom={isGroupRoom}
                  groupGalleryParticipants={groupGalleryParticipants}
                  remoteVideoRef={remoteVideoRef}
                  localVideoRef={localVideoRef}
                  showSearchingState={showSearchingState}
                  directSoloLayout={directSoloLayout}
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
                  liveSpeakerPeerId={liveSpeakerPeerId}
                  liveSpeakerSpeakingMs={liveSpeakerSpeakingMs}
                />

                <StageOverlays
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

                <CallTopBar
                  isOneToOneStage={isOneToOneStage}
                  isGroupRoom={isGroupRoom}
                  circleDisplayTitle={circleDisplayTitle}
                  canEditCircleTitle={Boolean(circleCanEditTitle)}
                  onEditCircleTitle={
                    circleRoomId && circleCanEditTitle ? () => setCircleRenameOpen(true) : undefined
                  }
                  activeActivityLabel={activeActivityLabel}
                  activeActivity={Boolean(stageActivity)}
                  mainStageShowsScreen={mainStageShowsScreen}
                  peerLabel={peerLabel}
                  onMinimize={onMinimize}
                  stageTrailingActions={
                    showStageFullscreenControl || showScreenShareAudioButton ? (
                      <>
                        {showStageFullscreenControl ? (
                          <button
                            type="button"
                            onClick={() => {
                              // Collapsing the share stage: re-surface People (participants
                              // + share roster) rather than leaving whatever tab was active.
                              if (stageFullscreen.isExpanded) surfacePeopleIfAvailable();
                              void stageFullscreen.toggle();
                            }}
                            aria-label={
                              stageFullscreen.isExpanded ? "Exit full screen" : "Full screen"
                            }
                            title={
                              stageFullscreen.isExpanded ? "Exit full screen" : "Full screen"
                            }
                            className={CALL_STAGE_CHROME_BTN_CLASS}
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
                            className={CALL_STAGE_CHROME_BTN_CLASS}
                          >
                            {screenShareAudioMuted ? (
                              <VolumeX size={18} className="shrink-0" />
                            ) : (
                              <Volume2 size={18} className="shrink-0" />
                            )}
                          </button>
                        ) : null}
                      </>
                    ) : undefined
                  }
                />
              </div>
            </div>

            <RoomVideoToolbar {...videoToolbarProps} />
          </div>

          <aside className="hidden min-h-0 w-full min-w-0 shrink-0 xl:flex xl:w-88 xl:flex-col">
            <RightSidebar {...rightPanelProps} variant="dock" />
          </aside>
        </div>

        {!xlUp ? (
          <Dialog open={mobileChatSheetOpen} onOpenChange={setMobileChatSheetOpen}>
            <DialogContent
              showCloseButton
              aria-describedby={undefined}
              className={cn(
                /* Above InCallContainer (`z-100`) and in-room dialogs. */
                IN_CALL_DIALOG_CONTENT_Z,
                "gap-0 border-x-0 border-b-0 p-0",
                "fixed! inset-x-0! bottom-0! top-auto! left-0! right-0! w-full! max-w-full!",
                "translate-x-0! translate-y-0! rounded-t-2xl rounded-b-none",
                "max-h-(--room-mobile-chat-sheet-max-h)",
              )}
              style={roomMobileChatSheetLayoutCssVars(mobileChatSheetDrag)}
              overlayClassName={IN_CALL_DIALOG_OVERLAY_Z}
            >
              <DialogTitle className="sr-only">
                {showActivitiesTab ? "People, chat, and activities" : "People and chat"}
              </DialogTitle>
              <div
                className={cn(
                  "flex min-h-0 flex-col overflow-hidden pb-[env(safe-area-inset-bottom)]",
                  "h-(--room-mobile-chat-sheet-h)",
                )}
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
                  <RightSidebar {...rightPanelProps} variant="sheet" />
                </div>
              </div>
            </DialogContent>
          </Dialog>
        ) : null}

        {circleRoomId && circleCanEditTitle ? (
          <CircleRenameDialog
            open={circleRenameOpen}
            onOpenChange={setCircleRenameOpen}
            roomId={circleRoomId}
            displayTitle={circleTitle}
          />
        ) : null}

        {circleRoomId ? (
          <RoomCircleCallOptionsDialog
            open={circleOptionsOpen}
            onOpenChange={setCircleOptionsOpen}
            roomId={circleRoomId}
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
