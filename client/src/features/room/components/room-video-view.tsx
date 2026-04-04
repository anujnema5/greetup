"use client";

import { useState, useEffect, useRef, type ReactNode } from "react";
import {
  Mic,
  MicOff,
  Minimize2,
  Monitor,
  MonitorOff,
  PhoneOff,
  SkipForward,
  Sparkles,
  Video,
  VideoOff,
} from "lucide-react";
import { canUseScreenShare } from "@/features/rtc/lib/screen-share-policy";
import { cn } from "@/lib/utils";
import {
  hasLiveEnabledVideo,
  hasLiveMedia,
  hasLiveVideo,
  type MediasoupRoomStatus,
} from "@/features/rtc";
import { MOCK_MATCH } from "../constants/mock-match";

export type RoomVideoViewProps = {
  onEnd: () => void;
  onSkip: () => void;
  /** Collapse to floating dock and return to the previous route. */
  onMinimize?: () => void;
  localStream?: MediaStream | null;
  remoteStream?: MediaStream | null;
  /** When true, main stage is a screen share — use contain fit and letterboxing. */
  mainStageShowsScreen?: boolean;
  /** Partner camera — shown in sidebar while `mainStageShowsScreen` so they stay visible. */
  remotePeerCameraStream?: MediaStream | null;
  mediaStatus?: MediasoupRoomStatus;
  mediaError?: string | null;
  peerLabel?: string;
  scoreLabel?: string | null;
  micEnabled?: boolean;
  cameraEnabled?: boolean;
  onToggleMic?: () => void;
  onToggleCamera?: () => void;
  rtcRoomType?: "direct" | "circle" | null;
  screenSharing?: boolean;
  onToggleScreenShare?: () => void;
  /** Camera/mic permission or device error from the last toggle. */
  localMediaDeviceError?: string | null;
  onDismissLocalMediaDeviceError?: () => void;
  /** Current user's display name shown in the local video panel. */
  myName?: string;
  /** True when the primary remote peer has explicitly paused their camera — show initials instead of black screen. */
  remotePeerCameraOff?: boolean;
};

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
  scoreLabel = `${MOCK_MATCH.vibeScore}% match`,
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
}: RoomVideoViewProps) {
  const [elapsed, setElapsed] = useState(0);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const peerCameraInsetRef = useRef<HTMLVideoElement>(null);
  const localVideoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const t = setInterval(() => setElapsed((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, []);

  // Video is live only when the track is active AND the peer hasn't explicitly paused their camera.
  const remoteVideoLive = hasLiveVideo(remoteStream) && !remotePeerCameraOff;
  const remoteMediaLive = hasLiveMedia(remoteStream);
  const localVideoLive = hasLiveEnabledVideo(localStream);

  const peerInitials = peerLabel
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join("");

  const peerCameraInsetStream =
    mainStageShowsScreen && remotePeerCameraStream && hasLiveVideo(remotePeerCameraStream)
      ? remotePeerCameraStream
      : null;
  const peerCameraInsetLive = hasLiveVideo(peerCameraInsetStream);

  useEffect(() => {
    const el = remoteVideoRef.current;
    if (!el) return;
    el.srcObject = remoteStream ?? null;
    if (remoteStream) {
      void el.play().catch(() => {});
    }
  }, [remoteStream, remoteVideoLive]);

  useEffect(() => {
    const el = localVideoRef.current;
    if (!el) return;
    el.srcObject = localStream ?? null;
    if (localStream) {
      void el.play().catch(() => {});
    }
  }, [localStream, localVideoLive]);

  useEffect(() => {
    const el = peerCameraInsetRef.current;
    if (!el) return;
    el.srcObject = peerCameraInsetStream ?? null;
    if (peerCameraInsetStream) {
      void el.play().catch(() => {});
    }
  }, [peerCameraInsetStream, peerCameraInsetLive]);

  const fmt = (s: number) =>
    `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
  const mediaTogglesReady =
    mediaStatus === "ready" && Boolean(onToggleMic && onToggleCamera);
  const screenShareAllowed = canUseScreenShare(rtcRoomType);
  const showScreenShare =
    screenShareAllowed && Boolean(onToggleScreenShare && onToggleMic && onToggleCamera);
  const mediaBusy =
    mediaStatus === "connecting_socket" ||
    mediaStatus === "joining" ||
    mediaStatus === "negotiating";

  const shell = (className: string) => (
    <div className={cn("flex flex-col overflow-hidden bg-background", className)}>
      <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden">
        <div
          className="absolute inset-0"
          style={{
            background: `linear-gradient(135deg, ${MOCK_MATCH.gradFrom}33, var(--card) 60%, ${MOCK_MATCH.gradTo}22)`,
          }}
        />

        <div className="flex min-h-0 flex-1 flex-col md:flex-row">
          {/* Main stage: screen share or remote / self primary video */}
          <div className="relative flex min-h-[48dvh] flex-1 flex-col overflow-hidden md:min-h-0">
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
                    (mainStageShowsScreen
                      ? "bg-black object-contain"
                      : "object-cover"),
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
                  {fmt(elapsed)}
                </div>
              </div>
            </div>

            <div
              className="pointer-events-none absolute bottom-3 left-3 z-10 flex items-center gap-1.5 rounded-full px-2.5 py-1 md:bottom-4 md:left-4 md:px-3 md:py-1.5"
              style={{
                background: "rgba(0,0,0,0.4)",
                border: "1px solid oklch(88% 0.11 105 / 0.2)",
                backdropFilter: "blur(8px)",
              }}
            >
              <Sparkles size={11} style={{ color: "oklch(88% 0.11 105)" }} />
              <span
                className="text-[11px] font-semibold"
                style={{ color: "oklch(88% 0.11 105)" }}
              >
                {scoreLabel ?? `${MOCK_MATCH.vibeScore}% match`}
              </span>
            </div>
          </div>

          {/* Local camera / mic preview — dedicated panel */}
          <aside
            className={cn(
              "flex w-full shrink-0 flex-col border-border bg-card/90 backdrop-blur-md md:w-56 md:border-l",
              "border-t md:border-t-0",
            )}
          >
            {peerCameraInsetStream ? (
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
                    {peerCameraInsetLive ? (
                      <video
                        ref={peerCameraInsetRef}
                        playsInline
                        autoPlay
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div
                        className="flex h-full min-h-[5rem] w-full items-center justify-center md:min-h-0"
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
            <div className="flex flex-1 items-center justify-center p-3 md:min-h-[9rem]">
              <div
                className="relative w-full max-w-md overflow-hidden rounded-xl md:max-w-none"
                style={{
                  border: "2px solid rgba(255,255,255,0.12)",
                  boxShadow: "0 8px 24px rgba(0,0,0,0.35)",
                  aspectRatio: "16 / 10",
                }}
              >
                {localVideoLive ? (
                  <video
                    ref={localVideoRef}
                    playsInline
                    autoPlay
                    muted
                    className="h-full w-full object-cover"
                    style={{ transform: "scaleX(-1)" }}
                  />
                ) : (
                  <div
                    className="flex h-full min-h-[7.5rem] w-full items-center justify-center md:min-h-0"
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
        </div>
      </div>

      <div
        className={cn(
          "flex shrink-0 flex-wrap items-center justify-center gap-4 border-t border-border px-3 py-3 sm:gap-5 sm:px-6 sm:py-4 md:gap-6",
          "bg-muted/50 pb-[max(0.75rem,env(safe-area-inset-bottom))] dark:bg-[oklch(11%_0.012_110)] sm:pb-4"
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
        <ToolbarAction
          label="Skip"
          onClick={onSkip}
          icon={<SkipForward size={20} className="text-foreground/75 dark:text-white/80" />}
          variant="secondary"
          size={56}
        />
        <ToolbarAction
          label="End call"
          onClick={onEnd}
          icon={<PhoneOff size={20} className="text-white" />}
          variant="danger"
          size={60}
        />
      </div>
    </div>
  );

  return shell("h-full min-h-0 w-full min-w-0");
}

function MediaToggleButton({
  active,
  labelActive,
  labelInactive,
  onClick,
  disabled,
  iconActive,
  iconInactive,
}: {
  active: boolean;
  labelActive: string;
  labelInactive: string;
  onClick: () => void;
  disabled: boolean;
  iconActive: ReactNode;
  iconInactive: ReactNode;
}) {
  const size = 52;
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={active ? labelActive : labelInactive}
      title={active ? labelActive : labelInactive}
      className={cn(
        "group flex min-h-[44px] min-w-[44px] cursor-pointer flex-col items-center justify-center gap-1 active:opacity-90 md:min-h-0 md:min-w-0 md:gap-1.5",
        disabled && "pointer-events-none opacity-40",
      )}
    >
      <div
        className={cn(
          "flex items-center justify-center rounded-xl border transition-colors duration-200",
          active
            ? "border-border bg-muted/60 dark:border-white/15 dark:bg-white/5"
            : "border-amber-500/35 bg-amber-950/40 dark:border-amber-400/30",
        )}
        style={{ width: size, height: size - 4 }}
      >
        {active ? iconActive : iconInactive}
      </div>
      <span className="max-w-[4.5rem] text-center text-[9px] text-muted-foreground md:max-w-none md:text-[10px] dark:text-white/45">
        {active ? labelActive : labelInactive}
      </span>
    </button>
  );
}

function ToolbarAction({
  label,
  onClick,
  icon,
  variant,
  size,
}: {
  label: string;
  onClick: () => void;
  icon: ReactNode;
  variant: "secondary" | "danger";
  size: number;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex min-h-[44px] min-w-[44px] cursor-pointer flex-col items-center justify-center gap-1.5 active:opacity-90 md:min-h-0 md:min-w-0 md:gap-2"
    >
      <div
        className={cn(
          "flex items-center justify-center rounded-xl transition-all duration-200",
          variant === "danger"
            ? "bg-red-500 hover:bg-red-400"
            : "border border-border bg-muted/60 hover:bg-muted dark:border-white/15 dark:bg-white/5 dark:hover:bg-white/10"
        )}
        style={{ width: size, height: size - 4 }}
      >
        {icon}
      </div>
      <span className="text-[9px] text-muted-foreground md:text-[10px] dark:text-white/45">{label}</span>
    </button>
  );
}
