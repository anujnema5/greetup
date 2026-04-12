"use client";

import { useState } from "react";
import {
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
  X,
} from "lucide-react";
import { ChatPanel } from "@/features/chat/components/chat-panel";
import { cn } from "@/lib/utils";
import { MOCK_MATCH } from "@/features/room/constants/mock-match";
import { useRoomVideoViewModel } from "@/features/room/hooks/use-room-video-view-model";
import type { RoomVideoViewProps } from "@/features/room/types/room-video-view.types";
import { MediaToggleButton } from "@/features/room/components/room-video/media-toggle-button";
import { RemoteParticipantTile } from "@/features/room/components/room-video/remote-participant-tile";
import { ToolbarActionButton } from "@/features/room/components/room-video/toolbar-action-button";

export type { RoomVideoViewProps } from "@/features/room/types/room-video-view.types";

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
}: RoomVideoViewProps) {
  const [chatOpen, setChatOpen] = useState(false);
  const vm = useRoomVideoViewModel({
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

  return (
    <div className={cn("flex h-full min-h-0 w-full min-w-0 flex-col overflow-hidden bg-background")}>
      <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden">
        <div
          className="absolute inset-0"
          style={{
            background: `linear-gradient(135deg, ${MOCK_MATCH.gradFrom}33, var(--card) 60%, ${MOCK_MATCH.gradTo}22)`,
          }}
        />

        <div className="flex min-h-0 flex-1 flex-col md:flex-row">
          <div className="relative flex min-h-[48dvh] flex-1 flex-col overflow-hidden md:min-h-0">
            {isGroupRoom ? (
              vm.groupGalleryParticipants.length > 0 ? (
                <div className="absolute inset-0 overflow-y-auto p-2 md:p-3">
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3 sm:gap-3">
                    {vm.groupGalleryParticipants.map((p) => (
                      <RemoteParticipantTile key={p.peer.peerId} participant={p} />
                    ))}
                  </div>
                </div>
              ) : (
                <div className="absolute inset-0 flex items-center justify-center px-4 text-center text-sm font-medium text-white/80">
                  Waiting for others to join…
                </div>
              )
            ) : (
              <>
                {vm.remoteMediaLive ? (
                  <video
                    ref={vm.remoteVideoRef}
                    playsInline
                    autoPlay
                    className={cn(
                      vm.remoteVideoLive
                        ? "absolute inset-0 h-full w-full"
                        : "pointer-events-none absolute h-px w-px overflow-hidden opacity-0",
                      vm.remoteVideoLive &&
                        (mainStageShowsScreen ? "bg-black object-contain" : "object-cover"),
                    )}
                  />
                ) : null}
                {!vm.remoteVideoLive && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="relative">
                      <div
                        className="flex h-32 w-32 items-center justify-center rounded-full text-3xl font-bold text-white transition-all duration-300 md:h-36 md:w-36 md:text-4xl"
                        style={{
                          background: `linear-gradient(135deg, ${MOCK_MATCH.gradFrom}, ${MOCK_MATCH.gradTo})`,
                          boxShadow: `0 0 60px ${MOCK_MATCH.gradFrom}55, 0 0 120px ${MOCK_MATCH.gradFrom}22`,
                        }}
                      >
                        {vm.peerInitials}
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

            {vm.mediaBusy && (
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
              className="pointer-events-none absolute inset-x-0 top-0 z-10 flex flex-wrap items-start justify-between gap-x-2 gap-y-2 px-3 pb-6 pt-3 sm:items-center sm:gap-x-3 md:px-4 md:pt-4"
              style={{
                background: "linear-gradient(to bottom, rgba(0,0,0,0.75), transparent)",
                userSelect: "none",
              }}
            >
              <div className="flex min-w-0 flex-1 items-center gap-2 sm:flex-initial">
                <div className="min-w-0">
                  <p className="truncate text-xs font-semibold leading-none text-white md:text-sm">
                    {mainStageShowsScreen ? "Screen share" : peerLabel}
                  </p>
                  {mainStageShowsScreen && (
                    <p className="mt-0.5 truncate text-[10px] text-white/50 md:text-[11px]">
                      {peerLabel}
                    </p>
                  )}
                </div>
              </div>

              <div className="pointer-events-auto ml-auto flex shrink-0 items-center gap-1.5 sm:gap-2">
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
                  {vm.formatDuration(vm.elapsed)}
                </div>
              </div>
            </div>

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
              "flex w-full shrink-0 flex-col border-border bg-card/90 backdrop-blur-md md:w-56 md:border-l",
              "border-t md:border-t-0",
            )}
          >
            {vm.peerCameraInsetStream ? (
              <>
                <div className="border-b border-border/60 px-3 py-2.5 md:py-2">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                    Peer
                  </p>
                  <p className="mt-0.5 truncate text-[10px] text-muted-foreground/80">{peerLabel}</p>
                </div>
                <div className="flex items-center justify-center p-3 pb-2 md:min-h-0">
                  <div
                    className="relative w-full max-w-md overflow-hidden rounded-xl md:max-w-none"
                    style={{
                      border: "2px solid rgba(255,255,255,0.12)",
                      boxShadow: "0 8px 24px rgba(0,0,0,0.35)",
                      aspectRatio: "16 / 10",
                    }}
                  >
                    {vm.peerCameraInsetLive ? (
                      <video
                        ref={vm.peerCameraInsetRef}
                        playsInline
                        autoPlay
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div
                        className="flex h-full min-h-20 w-full items-center justify-center md:min-h-0"
                        style={{
                          background:
                            "linear-gradient(135deg, oklch(30% 0.04 105), oklch(20% 0.02 110))",
                        }}
                      >
                        <span className="text-[10px] text-muted-foreground">No video</span>
                      </div>
                    )}
                  </div>
                </div>
                <div className="mx-3 border-t border-border/60 md:mx-0" />
              </>
            ) : null}
            <div className="border-b border-border/60 px-3 py-2.5 md:border-t-0 md:py-2">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                You
              </p>
              <p className="mt-0.5 truncate text-[10px] text-muted-foreground/80">{myName}</p>
            </div>
            <div className="flex flex-1 items-center justify-center p-3 md:min-h-36">
              <div
                className="relative w-full max-w-md overflow-hidden rounded-xl md:max-w-none"
                style={{
                  border: "2px solid rgba(255,255,255,0.12)",
                  boxShadow: "0 8px 24px rgba(0,0,0,0.35)",
                  aspectRatio: "16 / 10",
                }}
              >
                {vm.localVideoLive ? (
                  <video
                    ref={vm.localVideoRef}
                    playsInline
                    autoPlay
                    muted
                    className="h-full w-full object-cover"
                    style={{ transform: "scaleX(-1)" }}
                  />
                ) : (
                  <div
                    className="flex h-full min-h-30 w-full items-center justify-center md:min-h-0"
                    style={{
                      background:
                        "linear-gradient(135deg, oklch(30% 0.04 105), oklch(20% 0.02 110))",
                    }}
                  >
                    <div
                      className="flex h-12 w-12 items-center justify-center rounded-full text-sm font-bold"
                      style={{
                        background:
                          "radial-gradient(circle at 40% 35%, oklch(90% 0.11 105), oklch(78% 0.10 105))",
                        color: "oklch(20% 0.03 110)",
                      }}
                    >
                      {myName.charAt(0).toUpperCase()}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </aside>

          {/* In-room chat overlay — slides in from right on md+, bottom sheet on mobile */}
          {conversationId && chatOpen && (
            <div className={cn(
              "absolute inset-y-0 right-0 z-20 flex flex-col",
              "w-full md:w-80 bg-card/95 backdrop-blur-md border-l border-border",
            )}>
              <div className="flex items-center justify-between px-3 py-2 border-b border-border shrink-0">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Chat</span>
                <button
                  type="button"
                  onClick={() => setChatOpen(false)}
                  className="text-muted-foreground hover:text-foreground cursor-pointer"
                >
                  <X size={16} />
                </button>
              </div>
              <div className="flex-1 min-h-0">
                <ChatPanel conversationId={conversationId} />
              </div>
            </div>
          )}
        </div>
      </div>

      <div
        className={cn(
          "flex shrink-0 flex-wrap items-center justify-center gap-4 border-t border-border px-3 py-3 sm:gap-5 sm:px-6 sm:py-4 md:gap-6",
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
              disabled={!vm.mediaTogglesReady}
              iconActive={<Mic size={20} className="text-foreground/85 dark:text-white/90" />}
              iconInactive={<MicOff size={20} className="text-amber-200/95" />}
            />
            <MediaToggleButton
              active={cameraEnabled}
              labelActive="Stop video"
              labelInactive="Start video"
              onClick={onToggleCamera}
              disabled={!vm.mediaTogglesReady}
              iconActive={<Video size={20} className="text-foreground/85 dark:text-white/90" />}
              iconInactive={<VideoOff size={20} className="text-amber-200/95" />}
            />
            {vm.showScreenShare ? (
              <MediaToggleButton
                active={screenSharing}
                labelActive="Stop sharing"
                labelInactive="Share screen"
                onClick={onToggleScreenShare!}
                disabled={!vm.mediaTogglesReady}
                iconActive={<Monitor size={20} className="text-foreground/85 dark:text-white/90" />}
                iconInactive={<MonitorOff size={20} className="text-amber-200/95" />}
              />
            ) : null}
          </>
        )}
        {conversationId && (
          <ToolbarActionButton
            label="Chat"
            onClick={() => setChatOpen((o) => !o)}
            icon={<MessageCircle size={20} className={chatOpen ? "text-primary" : "text-foreground/75 dark:text-white/80"} />}
            variant="secondary"
            size={56}
          />
        )}
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
