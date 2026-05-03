"use client";

import type { RefObject } from "react";
import { Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CameraOffAvatar, TileMediaStatus, TileNameBadge, TileSpeakingRings, VideoMirror } from "@/features/room/components/room-video/room-video-primitives";

type StageRatio = "16:9" | "1:1";

export function RoomVideoStageOverlays({
  mediaBusy,
  mediaStatus,
  mediaError,
  localMediaDeviceError,
  onDismissLocalMediaDeviceError,
  isGroupRoom,
  activeActivity,
  stageRatio,
  localVideoLive,
  localVideoRef,
  myName,
  myInitial,
  myAvatarUrl,
  mainStageShowsScreen,
  peerCameraInsetStream,
  peerCameraInsetLive,
  peerCameraInsetRef,
  peerLabel,
  peerInitials,
  peerAvatarUrl,
  scoreLabel,
  micEnabled,
  cameraEnabled,
  localStream,
  participantVideosInSidebar = false,
  shareStageImmersive = false,
}: {
  mediaBusy: boolean;
  mediaStatus: string;
  mediaError: string | null;
  localMediaDeviceError: string | null;
  onDismissLocalMediaDeviceError?: () => void;
  isGroupRoom: boolean;
  activeActivity: boolean;
  stageRatio: StageRatio;
  localVideoLive: boolean;
  localVideoRef: RefObject<HTMLVideoElement | null>;
  myName: string;
  myInitial: string;
  myAvatarUrl?: string | null;
  mainStageShowsScreen: boolean;
  peerCameraInsetStream: MediaStream | null;
  peerCameraInsetLive: boolean;
  peerCameraInsetRef: RefObject<HTMLVideoElement | null>;
  peerLabel: string;
  peerInitials: string;
  peerAvatarUrl?: string | null;
  scoreLabel: string | null;
  micEnabled?: boolean;
  cameraEnabled?: boolean;
  localStream?: MediaStream | null;
  participantVideosInSidebar?: boolean;
  /** Share-only fullscreen on narrow — hide corner camera previews. */
  shareStageImmersive?: boolean;
}) {
  return (
    <>
      {mediaBusy ? (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/35 backdrop-blur-[2px]">
          <p className="rounded-full bg-black/50 px-4 py-2 text-sm font-medium text-white">
            Connecting media…
          </p>
        </div>
      ) : null}

      {mediaStatus === "error" && mediaError ? (
        <div
          className="absolute bottom-20 left-3 right-3 z-20 rounded-lg border border-red-500/40 bg-red-950/85 px-3 py-2 text-center text-xs text-red-100"
          role="alert"
        >
          {mediaError}
        </div>
      ) : null}

      {localMediaDeviceError && mediaStatus === "ready" ? (
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
      ) : null}

      {!isGroupRoom &&
      !activeActivity &&
      stageRatio !== "1:1" &&
      !participantVideosInSidebar &&
      !shareStageImmersive ? (
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
              <TileSpeakingRings stream={localStream ?? null}>
                <CameraOffAvatar
                  name={myName}
                  initials={myInitial}
                  imageUrl={myAvatarUrl}
                  sizeClass="h-14 w-14"
                />
              </TileSpeakingRings>
            </div>
          )}
          <TileNameBadge>You</TileNameBadge>
          <TileMediaStatus micOn={micEnabled} cameraOn={cameraEnabled} />
        </div>
      ) : null}

      {!isGroupRoom &&
      mainStageShowsScreen &&
      peerCameraInsetStream &&
      !activeActivity &&
      stageRatio !== "1:1" &&
      !participantVideosInSidebar &&
      !shareStageImmersive ? (
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
    </>
  );
}
