"use client";

import React, { useState } from "react";
import Image from "next/image";
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
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { getProfileImageUrl } from "@/lib/ui/profile-image";
import { MOCK_MATCH } from "@/features/room/constants/mock-match";
import { DIRECT_ROOM_ACTIVITIES } from "@/features/room/constants/direct-room-activities";
import { useRoomVideoViewModel } from "@/features/room/hooks/use-room-video-view-model";
import type { RoomVideoViewProps } from "@/features/room/types/room-video-view.types";
import { RemoteParticipantTile } from "@/features/room/components/room-video/remote-participant-tile";
import type { RoomActivityId } from "@/features/room/types/room-activity.types";
import { ActivityStage } from "@/features/room/components/room-activity/activity-stage";

export type { RoomVideoViewProps } from "@/features/room/types/room-video-view.types";

/**
 * VideoMirror — renders a <video> that mirrors the srcObject from a ref video element.
 * This keeps the real ref/stream alive in a persistent hidden element while
 * letting us display the same stream in multiple layouts without re-mounting the ref.
 */
function VideoMirror({
  srcRef,
  className,
  mirrored = false,
}: {
  srcRef: React.RefObject<HTMLVideoElement | null>;
  className?: string;
  mirrored?: boolean;
}) {
  const displayRef = React.useRef<HTMLVideoElement>(null);

  React.useEffect(() => {
    const src = srcRef.current;
    const dst = displayRef.current;
    if (!src || !dst) return;

    const sync = () => {
      if (dst.srcObject !== src.srcObject) {
        dst.srcObject = src.srcObject;
      }
    };

    sync();
    // Poll lightly in case stream is set after mount
    const interval = setInterval(sync, 300);
    return () => clearInterval(interval);
  }, [srcRef]);

  return (
    <video
      ref={displayRef}
      playsInline
      autoPlay
      muted={mirrored}
      className={className}
      style={mirrored ? { transform: "scaleX(-1)" } : undefined}
    />
  );
}

function CameraOffAvatar({
  name,
  initials,
  imageUrl,
  sizeClass,
}: {
  name: string;
  initials: string;
  imageUrl?: string | null;
  sizeClass: string;
}) {
  const hasImage = Boolean(imageUrl?.trim());

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-full border border-border/80 bg-muted text-foreground shadow-sm ring-1 ring-border/40",
        sizeClass,
      )}
    >
      {hasImage ? (
        <Image
          src={getProfileImageUrl(imageUrl)}
          alt={`${name} profile`}
          fill
          sizes="(max-width: 768px) 96px, 144px"
          className="object-cover"
          unoptimized
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center bg-primary/10 text-center text-lg font-semibold sm:text-xl">
          <span>{initials || "?"}</span>
        </div>
      )}
    </div>
  );
}

function TileNameBadge({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "absolute bottom-2 left-2 z-10 rounded-md border border-border/70 bg-card/90 px-2 py-0.5 text-[11px] font-semibold text-foreground shadow-sm",
        className,
      )}
    >
      {children}
    </div>
  );
}

function MediaControlButton({
  active,
  onClick,
  disabled,
  ariaLabel,
  iconOn,
  iconOff,
}: {
  active: boolean;
  onClick: () => void;
  disabled: boolean;
  ariaLabel: string;
  iconOn: React.ReactNode;
  iconOff: React.ReactNode;
}) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon-lg"
      onClick={onClick}
      disabled={disabled}
      aria-label={ariaLabel}
      className={cn(
        "h-11 w-11 rounded-full p-0 transition-colors disabled:cursor-not-allowed",
        active ? "bg-white/15 hover:bg-white/25" : "bg-amber-500/25 hover:bg-amber-500/35",
      )}
      style={{
        border: "1px solid rgba(255,255,255,0.18)",
        backdropFilter: "blur(8px)",
      }}
    >
      {active ? iconOn : iconOff}
    </Button>
  );
}

function CircleToolbarButton({
  onClick,
  ariaLabel,
  children,
  className,
}: {
  onClick: () => void;
  ariaLabel: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon-lg"
      onClick={onClick}
      aria-label={ariaLabel}
      className={cn(
        "h-11 w-11 rounded-full bg-white/15 p-0 transition-colors hover:bg-white/25",
        className,
      )}
      style={{
        border: "1px solid rgba(255,255,255,0.18)",
        backdropFilter: "blur(8px)",
      }}
    >
      {children}
    </Button>
  );
}

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
  const activeActivityMeta =
    DIRECT_ROOM_ACTIVITIES.find((activity) => activity.id === activeActivity) ?? null;
  const myInitial = myName.charAt(0).toUpperCase();
  const isOneToOneStage = !isGroupRoom && !activeActivity && stageRatio === "1:1";

  return (
    <div className="flex h-full min-h-0 w-full min-w-0 overflow-hidden bg-background">
      {/* ─── Gradient backdrop ─── */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: `linear-gradient(135deg, ${MOCK_MATCH.gradFrom}14, var(--background) 40%, ${MOCK_MATCH.gradTo}10)`,
        }}
      />

      {/* ─── Main layout: video stage + right sidebar ─── */}
      <div className="relative flex min-h-0 flex-1 flex-col gap-2 p-2 md:gap-3 md:p-3 lg:flex-row">

        {/* ─── Single video container (no outer wrapper border) ─── */}
        <div className="relative flex min-h-0 min-w-0 h-[56vh] flex-1 flex-col overflow-hidden rounded-2xl bg-black/60 shadow-xl sm:h-[62vh] lg:h-auto">

          {/* Remote video / group gallery */}
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
              <div className="absolute inset-0 flex items-center justify-center px-4 text-center text-sm font-medium text-white/50">
                Waiting for others to join…
              </div>
            )
          ) : (
            <>
              {/* ── Always-mounted persistent video elements (keep streams alive) ── */}
              {/* Remote video — always in DOM */}
              <video
                ref={remoteVideoRef}
                playsInline
                autoPlay
                className="pointer-events-none absolute h-px w-px opacity-0"
                aria-hidden
              />
              {/* Local video — always in DOM */}
              <video
                ref={localVideoRef}
                playsInline
                autoPlay
                muted
                className="pointer-events-none absolute h-px w-px opacity-0"
                style={{ transform: "scaleX(-1)" }}
                aria-hidden
              />

              {/* ── 1:1 side-by-side layout ── */}
              <div
                className="absolute inset-0 flex gap-2 p-3 pb-20"
                style={{ display: stageRatio === "1:1" && !activeActivity ? "flex" : "none" }}
              >
                {/* Remote panel */}
                <div className="relative flex-1 overflow-hidden rounded-2xl bg-black">
                  <VideoMirror srcRef={remoteVideoRef} className={cn(
                    "absolute inset-0 h-full w-full",
                    remoteVideoLive
                      ? mainStageShowsScreen ? "bg-black object-contain" : "object-cover"
                      : "opacity-0",
                  )} />
                  {!remoteVideoLive && (
                    <div className="absolute inset-0 flex items-center justify-center border border-border/60 bg-linear-to-br from-primary/15 via-muted/45 to-accent/20">
                      <CameraOffAvatar
                        name={peerLabel}
                        initials={peerInitials}
                        imageUrl={peerAvatarUrl}
                        sizeClass="h-20 w-20 md:h-24 md:w-24"
                      />
                    </div>
                  )}
                  <TileNameBadge
                    className="border-white/10 bg-black/55 text-white/90"
                    >
                    {peerLabel}
                  </TileNameBadge>
                </div>

                {/* Local panel */}
                <div className="relative flex-1 overflow-hidden rounded-2xl border border-border/60 bg-card">
                  <VideoMirror srcRef={localVideoRef} mirrored className={cn(
                    "absolute inset-0 h-full w-full object-cover",
                    !localVideoLive && "opacity-0",
                  )} />
                  {!localVideoLive && (
                    <div className="absolute inset-0 flex items-center justify-center border border-border/60 bg-linear-to-br from-primary/15 via-muted/45 to-accent/20">
                      <CameraOffAvatar
                        name={myName}
                        initials={myInitial}
                        imageUrl={myAvatarUrl}
                        sizeClass="h-20 w-20 md:h-24 md:w-24"
                      />
                    </div>
                  )}
                  <TileNameBadge>
                    You
                  </TileNameBadge>
                </div>
              </div>

              {/* ── 16:9 default layout — fills full container ── */}
              <div
                className="absolute inset-0 pb-20"
                style={{ display: stageRatio === "1:1" && !activeActivity ? "none" : "block" }}
              >
                <div className="relative h-full w-full overflow-hidden rounded-[1.2rem]">
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
                      <VideoMirror srcRef={remoteVideoRef} className={cn(
                        "absolute inset-0 h-full w-full",
                        remoteVideoLive
                          ? mainStageShowsScreen ? "bg-black object-contain" : "object-cover"
                          : "opacity-0",
                      )} />
                      {!remoteVideoLive && (
                        <div className="absolute inset-0 flex items-center justify-center border border-border/60 bg-linear-to-br from-primary/15 via-muted/45 to-accent/20">
                          <CameraOffAvatar
                            name={peerLabel}
                            initials={peerInitials}
                            imageUrl={peerAvatarUrl}
                            sizeClass="h-32 w-32 md:h-36 md:w-36"
                          />
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            </>
          )}

          {/* Connecting overlay */}
          {mediaBusy && (
            <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/35 backdrop-blur-[2px]">
              <p className="rounded-full bg-black/50 px-4 py-2 text-sm font-medium text-white">
                Connecting media…
              </p>
            </div>
          )}

          {/* Error banners */}
          {mediaStatus === "error" && mediaError && (
            <div
              className="absolute bottom-20 left-3 right-3 z-20 rounded-lg border border-red-500/40 bg-red-950/85 px-3 py-2 text-center text-xs text-red-100"
              role="alert"
            >
              {mediaError}
            </div>
          )}
          {localMediaDeviceError && mediaStatus === "ready" && (
            <div
              className="absolute bottom-20 left-3 right-3 z-20 flex items-start justify-between gap-2 rounded-lg border border-amber-500/45 bg-amber-950/90 px-3 py-2 text-left text-xs text-amber-50"
              role="alert"
            >
              <span className="min-w-0 flex-1">{localMediaDeviceError}</span>
              {onDismissLocalMediaDeviceError ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={onDismissLocalMediaDeviceError}
                  className="h-auto shrink-0 px-1.5 py-0.5 text-[10px] font-medium text-amber-200/90 underline-offset-2 hover:underline"
                >
                  Dismiss
                </Button>
              ) : null}
            </div>
          )}

          {/* ─── Top HUD: peer name + ratio toggle + timer + minimize ─── */}
          <div
            className="pointer-events-none absolute inset-x-0 top-0 z-10 flex flex-wrap items-start justify-between gap-x-2 gap-y-2 px-4 pb-7 pt-4 sm:items-center sm:gap-x-3 md:px-5 md:pt-5"
            style={{
              background: "linear-gradient(to bottom, rgba(0,0,0,0.75), transparent)",
              userSelect: "none",
            }}
          >
            <div className="flex min-w-0 flex-1 items-center gap-2 sm:flex-initial">
              <div className="min-w-0">
                {!isOneToOneStage ? (
                  <>
                    <p className="truncate text-xs font-semibold leading-none text-white md:text-sm">
                      {activeActivity
                        ? `${DIRECT_ROOM_ACTIVITIES.find((a) => a.id === activeActivity)?.label} activity`
                        : mainStageShowsScreen
                        ? "Screen share"
                        : peerLabel}
                    </p>
                    {(mainStageShowsScreen || activeActivity) && (
                      <p className="mt-0.5 truncate text-[11px] text-white/60">{peerLabel}</p>
                    )}
                  </>
                ) : null}
              </div>
            </div>

            <div className="pointer-events-auto ml-auto flex shrink-0 items-center gap-1.5 sm:gap-2">
              {!isGroupRoom ? (
                <div className="flex items-center overflow-hidden rounded-full border border-white/20 bg-black/50 shadow-sm">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setStageRatio("16:9")}
                    className={cn(
                      "h-auto rounded-none px-2.5 py-1 text-[11px] font-semibold text-white/70 transition-colors",
                      stageRatio === "16:9" && "bg-white/15 text-white",
                    )}
                  >
                    16:9
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setStageRatio("1:1")}
                    className={cn(
                      "h-auto rounded-none px-2.5 py-1 text-[11px] font-semibold text-white/70 transition-colors",
                      stageRatio === "1:1" && "bg-white/15 text-white",
                    )}
                  >
                    1:1
                  </Button>
                </div>
              ) : null}
              {onMinimize && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={onMinimize}
                  aria-label="Minimize call"
                  className="h-9 w-9 rounded-full text-white/90 transition-colors hover:bg-white/10"
                  style={{
                    background: "rgba(0,0,0,0.45)",
                    border: "1px solid rgba(255,255,255,0.1)",
                    backdropFilter: "blur(8px)",
                  }}
                >
                  <Minimize2 size={16} strokeWidth={2} />
                </Button>
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

          {/* ─── Bottom-left: action toolbar (round pill buttons) ─── */}
          {onToggleMic && onToggleCamera && (
            <div
              className="pointer-events-auto absolute bottom-4 left-4 z-20 flex items-center gap-2"
              style={{ userSelect: "none" }}
            >
              {/* Mic */}
              <MediaControlButton
                active={micEnabled}
                onClick={onToggleMic}
                disabled={!mediaTogglesReady}
                ariaLabel={micEnabled ? "Mute" : "Unmute"}
                iconOn={<Mic size={18} className="text-white/90" />}
                iconOff={<MicOff size={18} className="text-amber-200/95" />}
              />

              {/* Camera */}
              <MediaControlButton
                active={cameraEnabled}
                onClick={onToggleCamera}
                disabled={!mediaTogglesReady}
                ariaLabel={cameraEnabled ? "Stop video" : "Start video"}
                iconOn={<Video size={18} className="text-white/90" />}
                iconOff={<VideoOff size={18} className="text-amber-200/95" />}
              />

              {/* Screen share */}
              {showScreenShare ? (
                <MediaControlButton
                  active={screenSharing}
                  onClick={onToggleScreenShare!}
                  disabled={!mediaTogglesReady}
                  ariaLabel={screenSharing ? "Stop sharing" : "Share screen"}
                  iconOn={<Monitor size={18} className="text-white/90" />}
                  iconOff={<MonitorOff size={18} className="text-amber-200/95" />}
                />
              ) : null}

              {/* Divider */}
              <div className="mx-0.5 h-6 w-px bg-white/20" />

              {/* Chat */}
              {conversationId && (
                <CircleToolbarButton
                  onClick={() => setRightPanelTab("chat")}
                  ariaLabel="Chat"
                >
                  <MessageCircle
                    size={18}
                    className={rightPanelTab === "chat" ? "text-primary" : "text-white/80"}
                  />
                </CircleToolbarButton>
              )}

              {/* Activities */}
              {!isGroupRoom && (
                <CircleToolbarButton
                  onClick={() => setRightPanelTab("activities")}
                  ariaLabel="Activities"
                >
                  <LayoutGrid
                    size={18}
                    className={rightPanelTab === "activities" ? "text-primary" : "text-white/80"}
                  />
                </CircleToolbarButton>
              )}

              {/* Go Live */}
              {!isGroupRoom && (
                <CircleToolbarButton
                  onClick={() => setIsLive((p) => !p)}
                  ariaLabel={isLive ? "End Live" : "Go Live"}
                  className={isLive ? "bg-red-500/80 hover:bg-red-500" : undefined}
                >
                  <Radio size={18} className={isLive ? "text-white" : "text-white/80"} />
                </CircleToolbarButton>
              )}

              {/* Add to circle */}
              {showAddToCircle && onOpenAddToCircle && (
                <CircleToolbarButton
                  onClick={onOpenAddToCircle}
                  ariaLabel="Add"
                >
                  <UserPlus size={18} className="text-white/80" />
                </CircleToolbarButton>
              )}

              {/* Skip */}
              {showSkip && (
                <CircleToolbarButton
                  onClick={onSkip}
                  ariaLabel="Skip"
                >
                  <SkipForward size={18} className="text-white/80" />
                </CircleToolbarButton>
              )}

              {/* Divider */}
              <div className="mx-0.5 h-6 w-px bg-white/20" />

              {/* End call — slightly larger, red */}
              <Button
                type="button"
                variant="destructive"
                size="icon-lg"
                onClick={onEnd}
                aria-label="End call"
                className="h-11 w-11 rounded-full bg-red-500 transition-colors hover:bg-red-600"
                style={{
                  border: "1px solid rgba(255,255,255,0.1)",
                  backdropFilter: "blur(8px)",
                }}
              >
                <PhoneOff size={18} className="text-white" />
              </Button>
            </div>
          )}

          {/* ─── Local video PiP — bottom-right corner, above action buttons ─── */}
          {!isGroupRoom && !activeActivity && stageRatio !== "1:1" ? (
            <div
              className="pointer-events-none absolute z-20 overflow-hidden rounded-2xl border border-border/70 bg-card shadow-2xl"
              style={{
                bottom: "5.5rem",
                right: "0.5rem",
                width: "15rem",
                aspectRatio: "16/9",
                boxShadow: "0 10px 30px rgba(10, 12, 20, 0.22)",
              }}
            >
              {localVideoLive ? (
                <VideoMirror
                  srcRef={localVideoRef}
                  mirrored
                  className="absolute inset-0 h-full w-full object-cover"
                />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center border border-border/60 bg-muted">
                  <CameraOffAvatar
                    name={myName}
                    initials={myInitial}
                    imageUrl={myAvatarUrl}
                    sizeClass="h-14 w-14"
                  />
                </div>
              )}
              <TileNameBadge>
                You
              </TileNameBadge>
            </div>
          ) : null}

          {/* Peer camera inset (during screen share, 16:9 only) */}
          {!isGroupRoom && mainStageShowsScreen && peerCameraInsetStream && !activeActivity && stageRatio !== "1:1" ? (
            <div
              className="pointer-events-none absolute z-20 overflow-hidden rounded-xl border border-white/20 bg-black/80 shadow-lg"
              style={{ bottom: "4.5rem", right: "10.5rem", width: "9rem" }}
            >
              {peerCameraInsetLive ? (
                <video
                  ref={peerCameraInsetRef}
                  playsInline
                  autoPlay
                  className="h-24 w-full object-cover"
                />
              ) : (
                <div className="flex h-24 items-center justify-center border border-border/60 bg-linear-to-br from-primary/12 via-muted/45 to-accent/20">
                  <CameraOffAvatar
                    name={peerLabel}
                    initials={peerInitials}
                    imageUrl={peerAvatarUrl}
                    sizeClass="h-11 w-11"
                  />
                </div>
              )}
              <div
                className="absolute bottom-1.5 left-1.5 rounded px-1.5 py-0.5 text-[10px] font-semibold text-white/90"
                style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)" }}
              >
                {peerLabel}
              </div>
            </div>
          ) : null}

          {/* Score badge */}
          {scoreLabel != null ? (
            <div
              className="pointer-events-none absolute bottom-16 left-4 z-10 flex items-center gap-1.5 rounded-full px-2.5 py-1"
              style={{
                background: "rgba(0,0,0,0.4)",
                border: "1px solid oklch(88% 0.11 105 / 0.2)",
                backdropFilter: "blur(8px)",
              }}
            >
              <Zap size={11} style={{ color: "oklch(88% 0.11 105)" }} />
              <span className="text-[11px] font-semibold" style={{ color: "oklch(88% 0.11 105)" }}>
                {scoreLabel}
              </span>
            </div>
          ) : null}
        </div>

        {/* ─── Right panel: chat + activities (full height) ─── */}
        <aside className="flex h-[36vh] min-h-0 min-w-0 w-full shrink-0 flex-col overflow-hidden rounded-2xl border border-border/70 bg-card/92 backdrop-blur-md sm:h-[40vh] lg:h-auto lg:w-88">
          <Tabs
            value={rightPanelTab}
            onValueChange={(value) => {
              if (value === "chat" || (!isGroupRoom && value === "activities")) {
                setRightPanelTab(value);
              }
            }}
            className="min-h-0 flex-1 gap-0"
          >
            <div className="flex items-center justify-between border-b border-border/70 px-3 py-2">
              <TabsList className="h-auto rounded-md border border-border/60 bg-muted/70 p-0.5">
                <TabsTrigger value="chat" className="h-7 px-2.5 text-[12px] font-semibold">
                  chat
                </TabsTrigger>
                {!isGroupRoom ? (
                  <TabsTrigger value="activities" className="h-7 px-2.5 text-[12px] font-semibold">
                    activities
                  </TabsTrigger>
                ) : null}
              </TabsList>
              {isLive ? (
                <span className="rounded-full bg-red-500/90 px-2 py-0.5 text-[10px] font-semibold text-white">
                  LIVE
                </span>
              ) : null}
            </div>

            <TabsContent value="chat" className="mt-0">
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
            </TabsContent>

            {!isGroupRoom ? (
              <TabsContent value="activities" className="mt-0">
                <div className="grid grid-cols-2 gap-2.5 p-3">
                  {DIRECT_ROOM_ACTIVITIES.map((activity) => (
                    <Button
                      key={activity.id}
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setActiveActivity(activity.id);
                        setRightPanelTab("chat");
                      }}
                      className={cn(
                        "flex h-auto aspect-[1.3/1] flex-col items-center justify-center gap-1.5 rounded-xl border border-border bg-muted/35 p-2.5 text-center transition-all hover:bg-muted/60",
                        activeActivity === activity.id && "border-primary/60 bg-primary/10",
                      )}
                    >
                      <span className="text-[22px]">{activity.emoji}</span>
                      <span className="text-[12px] font-medium text-foreground">{activity.label}</span>
                    </Button>
                  ))}
                </div>
              </TabsContent>
            ) : null}
          </Tabs>
        </aside>
      </div>
    </div>
  );
}