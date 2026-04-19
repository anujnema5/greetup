"use client";

import { useState } from "react";
import {
  Radio,
  Mic,
  MicOff,
  Minimize2,
  Monitor,
  MonitorOff,
  PhoneOff,
  SkipForward,
  Zap,
  Video,
  VideoOff,
  MessageCircle,
  LayoutGrid,
  UserPlus,
} from "lucide-react";
import { ChatPanel } from "@/features/chat/components/chat-panel";
import { cn } from "@/lib/utils";
import { MOCK_MATCH } from "@/features/room/constants/mock-match";
import { DIRECT_ROOM_ACTIVITIES } from "@/features/room/constants/direct-room-activities";
import { useRoomVideoViewModel } from "@/features/room/hooks/use-room-video-view-model";
import type { RoomVideoViewProps } from "@/features/room/types/room-video-view.types";
import { MediaToggleButton } from "@/features/room/components/room-video/media-toggle-button";
import { RemoteParticipantTile } from "@/features/room/components/room-video/remote-participant-tile";
import { ToolbarActionButton } from "@/features/room/components/room-video/toolbar-action-button";
import type { RoomActivityId } from "@/features/room/types/room-activity.types";
import { ActivityStage } from "@/features/room/components/room-activity/activity-stage";

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
  remotePeerCameraOff = false,
  isGroupRoom = false,
  remoteParticipants = [],
  remotePeers = {},
  showSkip = true,
  conversationId = null,
  showAddToCircle = false,
  onOpenAddToCircle,
}: RoomVideoViewProps) {
  const [rightPanelTab, setRightPanelTab] = useState<RightPanelTab>("chat");
  const [activeActivity, setActiveActivity] = useState<RoomActivityId | null>(null);
  const [stageRatio, setStageRatio] = useState<StageRatio>("16:9");
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
  const activeActivityMeta =
    DIRECT_ROOM_ACTIVITIES.find((activity) => activity.id === activeActivity) ?? null;

  return (
    <div className={cn("flex h-full min-h-0 w-full min-w-0 flex-col overflow-hidden bg-background")}>
      <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden">
        <div
          className="absolute inset-0"
          style={{
            background: `linear-gradient(135deg, ${MOCK_MATCH.gradFrom}14, var(--background) 40%, ${MOCK_MATCH.gradTo}10)`,
          }}
        />

        <div className="flex min-h-0 flex-1 flex-col gap-2 p-2 pt-3 md:flex-row md:gap-3 md:p-3">
          <div className="relative flex min-h-[48dvh] flex-1 flex-col overflow-hidden rounded-2xl border border-border/60 bg-card/50 shadow-xl backdrop-blur-sm md:min-h-0">
            {isGroupRoom ? (
              groupGalleryParticipants.length > 0 ? (
                <div className="absolute inset-0 overflow-y-auto p-2 md:p-3">
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3 sm:gap-3">
                    {groupGalleryParticipants.map((p) => (
                      <RemoteParticipantTile key={p.peer.peerId} participant={p} />
                    ))}
                  </div>
                </div>
              ) : (
                <div className="absolute inset-0 flex items-center justify-center px-4 text-center text-sm font-medium text-muted-foreground">
                  Waiting for others to join…
                </div>
              )
            ) : (
              <div className="relative flex min-h-0 flex-1 items-center justify-center p-3 md:p-4">
                <div
                  className={cn(
                    "relative w-full max-w-[1200px] overflow-hidden rounded-[1.2rem] border border-border/60 bg-black/45 shadow-[0_10px_28px_rgba(0,0,0,0.26)]",
                    stageRatio === "1:1" ? "aspect-square max-h-full" : "aspect-video max-h-full",
                  )}
                >
                  {activeActivity ? (
                    activeActivityMeta ? (
                      <ActivityStage
                        activity={activeActivityMeta}
                        onExit={() => setActiveActivity(null)}
                        peerLabel={peerLabel}
                        myName={myName}
                        peerInitials={peerInitials}
                        remoteVideoLive={remoteVideoLive}
                        localVideoLive={localVideoLive}
                        remoteVideoRef={remoteVideoRef}
                        localVideoRef={localVideoRef}
                      />
                    ) : null
                  ) : (
                    <>
                      {remoteMediaLive ? (
                        <video
                          ref={remoteVideoRef}
                          playsInline
                          autoPlay
                          className={cn(
                            remoteVideoLive
                              ? "absolute inset-0 h-full w-full"
                              : "pointer-events-none absolute h-px w-px overflow-hidden opacity-0",
                            remoteVideoLive &&
                              (mainStageShowsScreen ? "bg-black object-contain" : "object-cover"),
                          )}
                        />
                      ) : null}
                      {!remoteVideoLive && (
                        <div className="absolute inset-0 flex items-center justify-center">
                          <div className="relative">
                            <div
                              className="flex h-32 w-32 items-center justify-center rounded-full text-3xl font-bold text-white transition-all duration-300 md:h-36 md:w-36 md:text-4xl"
                              style={{
                                background: `linear-gradient(135deg, ${MOCK_MATCH.gradFrom}, ${MOCK_MATCH.gradTo})`,
                                boxShadow: `0 0 60px ${MOCK_MATCH.gradFrom}55, 0 0 120px ${MOCK_MATCH.gradFrom}22`,
                              }}
                            >
                              {peerInitials}
                            </div>
                            <div
                              className="absolute -inset-3 animate-pulse rounded-full"
                              style={{
                                background: `radial-gradient(circle, ${MOCK_MATCH.gradFrom}30, transparent 70%)`,
                                animationDuration: "2.5s",
                              }}
                            />
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            )}

            {mediaBusy && (
              <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/35 backdrop-blur-[2px]">
                <p className="rounded-full bg-black/50 px-4 py-2 text-sm font-medium text-white">
                  Connecting media…
                </p>
              </div>
            )}

            {mediaStatus === "error" && mediaError && (
              <div
                className="absolute bottom-20 left-3 right-3 z-20 rounded-lg border border-red-500/40 bg-red-950/85 px-3 py-2 text-center text-xs text-red-100 md:bottom-24"
                role="alert"
              >
                {mediaError}
              </div>
            )}

            {localMediaDeviceError && mediaStatus === "ready" && (
              <div
                className="absolute bottom-20 left-3 right-3 z-20 flex items-start justify-between gap-2 rounded-lg border border-amber-500/45 bg-amber-950/90 px-3 py-2 text-left text-xs text-amber-50 md:bottom-24"
                role="alert"
              >
                <span className="min-w-0 flex-1">{localMediaDeviceError}</span>
                {onDismissLocalMediaDeviceError ? (
                  <button
                    type="button"
                    onClick={onDismissLocalMediaDeviceError}
                    className="shrink-0 rounded px-1.5 py-0.5 text-[10px] font-medium text-amber-200/90 underline-offset-2 hover:underline"
                  >
                    Dismiss
                  </button>
                ) : null}
              </div>
            )}

            <div
              className="pointer-events-none absolute inset-x-0 top-0 z-10 flex flex-wrap items-start justify-between gap-x-2 gap-y-2 px-4 pb-7 pt-4 sm:items-center sm:gap-x-3 md:px-5 md:pt-5"
              style={{
                background: "linear-gradient(to bottom, rgba(0,0,0,0.75), transparent)",
                userSelect: "none",
              }}
            >
              <div className="flex min-w-0 flex-1 items-center gap-2 sm:flex-initial">
                <div className="min-w-0">
                  <p className="truncate text-xs font-semibold leading-none text-white md:text-sm">
                    {activeActivity
                      ? `${DIRECT_ROOM_ACTIVITIES.find((activity) => activity.id === activeActivity)?.label} activity`
                      : mainStageShowsScreen
                        ? "Screen share"
                        : peerLabel}
                  </p>
                  {(mainStageShowsScreen || activeActivity) && (
                    <p className="mt-0.5 truncate text-[11px] text-white/60">
                      {activeActivity ? peerLabel : peerLabel}
                    </p>
                  )}
                </div>
              </div>

              <div className="pointer-events-auto ml-auto flex shrink-0 items-center gap-1.5 sm:gap-2">
                {!isGroupRoom ? (
                  <div className="flex items-center overflow-hidden rounded-full border border-white/20 bg-black/50 shadow-sm">
                    <button
                      type="button"
                      onClick={() => setStageRatio("16:9")}
                      className={cn(
                        "cursor-pointer px-2.5 py-1 text-[11px] font-semibold text-white/70 transition-colors",
                        stageRatio === "16:9" && "bg-white/15 text-white",
                      )}
                    >
                      16:9
                    </button>
                    <button
                      type="button"
                      onClick={() => setStageRatio("1:1")}
                      className={cn(
                        "cursor-pointer px-2.5 py-1 text-[11px] font-semibold text-white/70 transition-colors",
                        stageRatio === "1:1" && "bg-white/15 text-white",
                      )}
                    >
                      1:1
                    </button>
                  </div>
                ) : null}
                {onMinimize && (
                  <button
                    type="button"
                    onClick={onMinimize}
                    aria-label="Minimize call"
                    className="flex h-11 w-11 cursor-pointer items-center justify-center rounded-full text-white/90 transition-colors hover:bg-white/10 sm:h-10 sm:w-10"
                    style={{
                      background: "rgba(0,0,0,0.45)",
                      border: "1px solid rgba(255,255,255,0.1)",
                      backdropFilter: "blur(8px)",
                    }}
                  >
                    <Minimize2 size={18} strokeWidth={2} />
                  </button>
                )}
                <div
                  className="rounded-full px-2 py-0.5 font-mono text-[10px] font-semibold text-white/70 md:px-2.5 md:text-[11px]"
                  style={{
                    background: "rgba(0,0,0,0.45)",
                    border: "1px solid rgba(255,255,255,0.1)",
                    backdropFilter: "blur(8px)",
                  }}
                >
                  {formatDuration(elapsed)}
                </div>
              </div>
            </div>

            {!isGroupRoom && !activeActivity ? (
              <div className="pointer-events-none absolute bottom-4 left-4 z-20 w-34 overflow-hidden rounded-lg border border-white/20 bg-black/60 shadow-lg md:w-40">
                {localVideoLive ? (
                  <video
                    ref={localVideoRef}
                    playsInline
                    autoPlay
                    muted
                    className="h-24 w-full object-cover"
                    style={{ transform: "scaleX(-1)" }}
                  />
                ) : (
                  <div className="flex h-24 items-center justify-center text-xs font-semibold text-white/85">
                    {myName.charAt(0).toUpperCase()}
                  </div>
                )}
                <p className="truncate px-2 py-1 text-[10px] text-white/80">You</p>
              </div>
            ) : null}

            {!isGroupRoom && mainStageShowsScreen && peerCameraInsetStream && !activeActivity ? (
              <div className="pointer-events-none absolute bottom-4 left-42 z-20 w-34 overflow-hidden rounded-lg border border-white/20 bg-black/60 shadow-lg md:left-44 md:w-40">
                {peerCameraInsetLive ? (
                  <video
                    ref={peerCameraInsetRef}
                    playsInline
                    autoPlay
                    className="h-24 w-full object-cover"
                  />
                ) : (
                  <div className="flex h-24 items-center justify-center text-xs font-semibold text-white/85">
                    {peerInitials}
                  </div>
                )}
                <p className="truncate px-2 py-1 text-[10px] text-white/80">{peerLabel}</p>
              </div>
            ) : null}

            {scoreLabel != null ? (
              <div
                className="pointer-events-none absolute bottom-3 left-3 z-10 flex items-center gap-1.5 rounded-full px-2.5 py-1 md:bottom-4 md:left-4 md:px-3 md:py-1.5"
                style={{
                  background: "rgba(0,0,0,0.4)",
                  border: "1px solid oklch(88% 0.11 105 / 0.2)",
                  backdropFilter: "blur(8px)",
                }}
              >
                <Zap size={11} style={{ color: "oklch(88% 0.11 105)" }} />
                <span
                  className="text-[11px] font-semibold"
                  style={{ color: "oklch(88% 0.11 105)" }}
                >
                  {scoreLabel}
                </span>
              </div>
            ) : null}
          </div>

          <aside
            className={cn(
              "flex w-full shrink-0 flex-col overflow-hidden rounded-2xl border border-border/70 bg-card/92 backdrop-blur-md md:w-88",
            )}
          >
            <div className="flex items-center justify-between border-b border-border/70 px-3 py-2.5">
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setRightPanelTab("chat")}
                  className={cn(
                    "rounded-md px-2.5 py-1 text-[12px] font-semibold transition-colors",
                    rightPanelTab === "chat"
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  chat
                </button>
                {!isGroupRoom ? (
                  <button
                    type="button"
                    onClick={() => setRightPanelTab("activities")}
                    className={cn(
                      "rounded-md px-2.5 py-1 text-[12px] font-semibold transition-colors",
                      rightPanelTab === "activities"
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:text-foreground",
                    )}
                  >
                    activities
                  </button>
                ) : null}
              </div>
              {isLive ? (
                <span className="rounded-full bg-red-500/90 px-2 py-0.5 text-[10px] font-semibold text-white">
                  LIVE
                </span>
              ) : null}
            </div>

            {rightPanelTab === "activities" && !isGroupRoom ? (
              <div className="grid grid-cols-2 gap-2.5 p-3">
                {DIRECT_ROOM_ACTIVITIES.map((activity) => (
                  <button
                    key={activity.id}
                    type="button"
                    onClick={() => {
                      setActiveActivity(activity.id);
                      setRightPanelTab("chat");
                    }}
                    className={cn(
                      "flex aspect-[1.3/1] flex-col items-center justify-center gap-1.5 rounded-xl border border-border bg-muted/35 p-2.5 text-center transition-all hover:bg-muted/60",
                      activeActivity === activity.id && "border-primary/60 bg-primary/10",
                    )}
                  >
                    <span className="text-[22px]">{activity.emoji}</span>
                    <span className="text-[12px] font-medium text-foreground">{activity.label}</span>
                  </button>
                ))}
              </div>
            ) : (
              <div className="flex min-h-0 flex-1 flex-col">
                {conversationId ? (
                  <ChatPanel
                    conversationId={conversationId}
                    conversationType={isGroupRoom ? "room_circle" : "room_direct"}
                    showQuickReactions
                  />
                ) : (
                  <div className="flex min-h-0 flex-1 items-center justify-center px-4 text-center text-sm text-muted-foreground">
                    Chat will appear once this room conversation is available.
                  </div>
                )}
              </div>
            )}
          </aside>
        </div>
      </div>

      <div
        className={cn(
          "flex shrink-0 flex-wrap items-center justify-center gap-4 border-t border-border/70 px-3 py-3 sm:gap-5 sm:px-6 sm:py-4 md:gap-5",
          "bg-muted/50 pb-[max(0.75rem,env(safe-area-inset-bottom))] dark:bg-[oklch(11%_0.012_110)] sm:pb-4",
        )}
        style={{ userSelect: "none" }}
      >
        {onToggleMic && onToggleCamera && (
          <>
            <MediaToggleButton
              active={micEnabled}
              labelActive="Mute"
              labelInactive="Unmute"
              onClick={onToggleMic}
              disabled={!mediaTogglesReady}
              iconActive={<Mic size={20} className="text-foreground/85 dark:text-white/90" />}
              iconInactive={<MicOff size={20} className="text-amber-200/95" />}
            />
            <MediaToggleButton
              active={cameraEnabled}
              labelActive="Stop video"
              labelInactive="Start video"
              onClick={onToggleCamera}
              disabled={!mediaTogglesReady}
              iconActive={<Video size={20} className="text-foreground/85 dark:text-white/90" />}
              iconInactive={<VideoOff size={20} className="text-amber-200/95" />}
            />
            {showScreenShare ? (
              <MediaToggleButton
                active={screenSharing}
                labelActive="Stop sharing"
                labelInactive="Share screen"
                onClick={onToggleScreenShare!}
                disabled={!mediaTogglesReady}
                iconActive={<Monitor size={20} className="text-foreground/85 dark:text-white/90" />}
                iconInactive={<MonitorOff size={20} className="text-amber-200/95" />}
              />
            ) : null}
          </>
        )}
        {conversationId && (
          <ToolbarActionButton
            label="Chat"
            onClick={() => setRightPanelTab("chat")}
            icon={
              <MessageCircle
                size={20}
                className={
                  rightPanelTab === "chat" ? "text-primary" : "text-foreground/75 dark:text-white/80"
                }
              />
            }
            variant="secondary"
            size={56}
          />
        )}
        {!isGroupRoom ? (
          <ToolbarActionButton
            label="Activities"
            onClick={() => setRightPanelTab("activities")}
            icon={
              <LayoutGrid
                size={20}
                className={
                  rightPanelTab === "activities"
                    ? "text-primary"
                    : "text-foreground/75 dark:text-white/80"
                }
              />
            }
            variant="secondary"
            size={56}
          />
        ) : null}
        {!isGroupRoom ? (
          <ToolbarActionButton
            label={isLive ? "End Live" : "Go Live"}
            onClick={() => setIsLive((prev) => !prev)}
            icon={<Radio size={20} className={isLive ? "text-red-300" : "text-foreground/75 dark:text-white/80"} />}
            variant="secondary"
            size={56}
          />
        ) : null}
        {showAddToCircle && onOpenAddToCircle ? (
          <ToolbarActionButton
            label="Add"
            onClick={onOpenAddToCircle}
            icon={<UserPlus size={20} className="text-foreground/75 dark:text-white/80" />}
            variant="secondary"
            size={56}
          />
        ) : null}
        {showSkip ? (
          <ToolbarActionButton
            label="Skip"
            onClick={onSkip}
            icon={<SkipForward size={20} className="text-foreground/75 dark:text-white/80" />}
            variant="secondary"
            size={56}
          />
        ) : null}
        <ToolbarActionButton
          label="End call"
          onClick={onEnd}
          icon={<PhoneOff size={20} className="text-white" />}
          variant="danger"
          size={60}
        />
      </div>
    </div>
  );
}
