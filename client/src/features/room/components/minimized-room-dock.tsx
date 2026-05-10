"use client";

import { useCallback, useMemo, useRef } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useSession } from "@/lib/auth-client";
import { useAppDispatch, useAppSelector } from "@/lib/redux/hooks";
import {
  selectActiveRoomId,
  selectDirectCallPeerLabel,
  selectIsRoomMinimized,
  selectIsVideoSessionActive,
  selectRtcPrimaryRemoteUserId,
} from "@/lib/redux/selectors/room-selectors";
import { expandVideoSession } from "@/lib/redux/slices/room-slice";
import { isCircleRoomData } from "@/features/matching";
import { useGetRoomQuery } from "@/features/room/api/room-api";
import { useRoomVideo } from "@/features/room/hooks/use-room-video";
import { useMinimizedDockMainStage } from "@/features/room/hooks/use-minimized-dock-main-stage";
import { MOCK_MATCH } from "@/features/room/constants/mock-match";
import { mediaStreamVideoAttachRevision, useRtcSocketContext } from "@/features/rtc";
import { canUseScreenShare } from "@/features/rtc/lib/screen-share-policy";
import { useMobileWebRtcUi } from "@/features/rtc/hooks/use-mobile-web-rtc-ui";
import { allowScreenShareCallControl } from "@/features/rtc/lib/rtc-mobile-profile";
import { cn } from "@/lib/utils";
import {
  Mic,
  MicOff,
  Monitor,
  MonitorOff,
  PhoneOff,
  SkipForward,
  SquareArrowOutUpRight,
  Video,
  VideoOff,
} from "lucide-react";
import { MinimizedDockVideoFromSink } from "@/features/room/components/minimized-dock-video-sink";
import { useCallElapsedSeconds } from "@/features/room/hooks/use-call-elapsed-seconds";
import {
  MINIMIZED_DOCK_OFFSET_STORAGE_KEY,
  useMinimizedDockDrag,
} from "@/features/room/hooks/use-minimized-dock-drag";
import { clearRoomMinimized } from "@/features/room/lib/room-sync";
import { formatCallDuration } from "@/features/room/lib/format-call-duration";
import {
  DOMINANT_SPEAKER_TILE_RING,
  isDominantSpeakerPeer,
} from "@/features/room/lib/dominant-speaker-tile";
import {
  CameraOffAvatar,
  TileSpeakingRings,
} from "@/features/room/components/room-video/room-video-primitives";
import { useRerenderOnVideoTrackMuteCycle } from "@/features/room/hooks/use-attach-media-stream";

function displayInitials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join("");
}

/** Heavy RTC + dock logic — only mounted when {@link MinimizedRoomDock} gate says minimized + off /circle. */
function MinimizedRoomDockPanel() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const isActive = useAppSelector(selectIsVideoSessionActive);
  const activeRoomId = useAppSelector(selectActiveRoomId);
  const rtcPrimaryRemoteUserId = useAppSelector(selectRtcPrimaryRemoteUserId);
  const directCallPeerLabel = useAppSelector(selectDirectCallPeerLabel);
  const { data: session } = useSession();
  const currentUserId = session?.user?.id ?? null;
  const localProfileImageUrl = session?.user?.image ?? null;

  const { data: dockRoomMeta } = useGetRoomQuery(activeRoomId ?? "", {
    skip: !activeRoomId || !isActive,
  });
  const dockSessionIsCircle = Boolean(dockRoomMeta && isCircleRoomData(dockRoomMeta));

  const { handleEnd: roomHandleEnd, handleSkip: roomHandleSkip } = useRoomVideo(
    activeRoomId ?? "",
    { skipSetup: true },
  );

  const {
    localMediaStream,
    remoteMediaStream,
    mainStageShowsScreen,
    remoteParticipants,
    remoteTrackMediaSource,
    dominantSpeakerPeerId,
    mediasoupStatus,
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

  const dockStage = useMinimizedDockMainStage({
    mainStageShowsScreen,
    remoteMediaStream,
    remoteParticipants,
    remoteTrackMediaSource,
    dominantSpeakerPeerId,
    rtcRoomType,
    rtcPrimaryRemoteUserId,
    currentUserId,
    localMediaStream,
    directCallPeerLabel,
  });

  const mediaControlsReady = mediasoupStatus === "ready";
  const screenShareAllowed = canUseScreenShare(rtcRoomType);
  const mobileWebCallUi = useMobileWebRtcUi();
  const showScreenShareInDock =
    screenShareAllowed && allowScreenShareCallControl(mobileWebCallUi, screenSharing);
  const mainVideoLive = dockStage.mainVideoLive;
  const mainStream = dockStage.mainStream;
  const mainAttachKey = mediaStreamVideoAttachRevision(mainStream);

  const sideStripStream = dockStage.sideStrip.stream;
  const sideStripMuteCycle = useRerenderOnVideoTrackMuteCycle(sideStripStream);
  const sideAttachKey = `${sideStripMuteCycle}:${mediaStreamVideoAttachRevision(sideStripStream)}`;
  const sideStripRemote = dockStage.sideStrip.remotePeer;
  const sideStripMicMuted = sideStripRemote
    ? sideStripRemote.peer.micActive === false
    : !micEnabled;

  const mainTileDominant =
    !dockStage.mainStageShowsScreen &&
    Boolean(
      dockStage.mainFocusPeerId &&
        isDominantSpeakerPeer(dominantSpeakerPeerId, dockStage.mainFocusPeerId),
    );

  const mainAvatar = useMemo(() => {
    const p = dockStage.mainParticipant;
    if (p) {
      return {
        name: dockStage.headerLabel,
        initials: displayInitials(
          p.peer.displayName?.trim() || dockStage.headerLabel || "?",
        ),
        imageUrl: p.peer.image ?? null,
        micOff: p.peer.micActive === false,
        stream: p.stream,
      };
    }
    if (dockStage.headerLabel === "You") {
      return {
        name: "You",
        initials: "You".slice(0, 2).toUpperCase(),
        imageUrl: null as string | null,
        micOff: !micEnabled,
        stream: localMediaStream,
      };
    }
    return {
      name: dockStage.headerLabel,
      initials: displayInitials(dockStage.headerLabel || "?"),
      imageUrl: null as string | null,
      micOff: undefined as boolean | undefined,
      stream: null as MediaStream | null,
    };
  }, [dockStage.mainParticipant, dockStage.headerLabel, micEnabled, localMediaStream]);

  const cardRef = useRef<HTMLDivElement>(null);
  const elapsed = useCallElapsedSeconds(true);
  const { onDragPointerDown, onDragPointerMove, onDragPointerUp } = useMinimizedDockDrag(
    cardRef,
    true,
    elapsed,
  );

  const handleExpand = useCallback(() => {
    dispatch(expandVideoSession());
    // Keep `ROOM_MINIMIZED_KEY` until `/circle` mounts `RoomVideoLayer` (`useRoomVideo` clears it).
    // Clearing here runs before navigation; `useRoomPageTabLease` cleanup then thinks we fully
    // left the room and dispatches `resetRoomState()`, which tears down RTC and forces re-join.
    if (activeRoomId) {
      router.push(`/circle/${activeRoomId}`);
    } else {
      clearRoomMinimized();
      router.push("/home");
    }
  }, [dispatch, router, activeRoomId]);

  const clearDockOffset = useCallback(() => {
    try {
      sessionStorage.removeItem(MINIMIZED_DOCK_OFFSET_STORAGE_KEY);
    } catch {
      /* ignore */
    }
  }, []);

  const handleEnd = useCallback(() => {
    clearDockOffset();
    roomHandleEnd();
  }, [roomHandleEnd, clearDockOffset]);

  const handleSkip = useCallback(() => {
    clearDockOffset();
    roomHandleSkip();
  }, [roomHandleSkip, clearDockOffset]);

  const tileShell =
    "relative flex min-h-0 min-w-0 flex-col overflow-hidden rounded-xl bg-zinc-950/90 ring-1 ring-white/12 shadow-inner shadow-black/40";

  return (
    <div
      ref={cardRef}
      className={cn(
        "fixed z-200 flex max-h-[min(92dvh,calc(100vh-1rem))] flex-col overflow-hidden rounded-2xl border border-border bg-card/95 shadow-2xl backdrop-blur-md max-md:rounded-xl",
        "w-[min(28rem,calc(100vw-1rem))] max-md:max-w-[calc(100vw-0.75rem)]",
        "max-md:bottom-[5.25rem] max-md:right-2 max-md:left-2 md:bottom-4 md:right-4 md:left-auto md:w-[min(28rem,calc(100vw-1.25rem))]",
      )}
      style={{
        boxShadow: "0 16px 48px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.06)",
        touchAction: "manipulation",
      }}
    >
      <div
        aria-label="Move call window"
        onPointerDown={onDragPointerDown}
        onPointerMove={onDragPointerMove}
        onPointerUp={onDragPointerUp}
        onPointerCancel={onDragPointerUp}
        className={cn(
          "relative w-full shrink-0 cursor-default overflow-hidden select-none touch-none",
          "min-h-[12.5rem] sm:min-h-[14rem] md:min-h-[15rem]",
        )}
      >
        <div
          className={cn(
            "grid h-full min-h-[inherit] w-full min-w-0 grid-cols-[minmax(0,1fr)_minmax(4.75rem,26%)] gap-1.5 p-2 sm:grid-cols-[minmax(0,1fr)_6rem] sm:gap-2 sm:p-2.5",
          )}
        >
          <div className={cn(tileShell, "min-h-[10.5rem] sm:min-h-[11.5rem]", mainTileDominant && DOMINANT_SPEAKER_TILE_RING)}>
            <div className="absolute inset-0 overflow-hidden rounded-[inherit]">
              <div
                className="absolute inset-0"
                style={{
                  background: `linear-gradient(145deg, ${MOCK_MATCH.gradFrom}35, var(--card) 40%, ${MOCK_MATCH.gradTo}30)`,
                }}
              />
              <div
                className="pointer-events-none absolute inset-0 opacity-[0.28]"
                style={{
                  backgroundImage:
                    "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(255,255,255,0.03) 2px, rgba(255,255,255,0.03) 3px), repeating-linear-gradient(90deg, transparent, transparent 2px, rgba(255,255,255,0.02) 2px, rgba(255,255,255,0.02) 3px)",
                }}
              />
              {dockStage.mainHasPlayableMedia ? (
                <MinimizedDockVideoFromSink
                  stream={mainStream}
                  attachRevision={mainAttachKey}
                  mirrored={dockStage.mainVideoMuted}
                  videoVisible={mainVideoLive}
                  visibleClassName={cn(
                    "absolute inset-0 h-full w-full rounded-[inherit]",
                    dockStage.mainStageShowsScreen ? "bg-black object-contain" : "object-cover",
                  )}
                  audioOnlyClassName="pointer-events-none absolute h-px w-px overflow-hidden opacity-0"
                />
              ) : null}
              {!mainVideoLive && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                  <TileSpeakingRings
                    stream={mainAvatar.micOff === true ? null : mainAvatar.stream}
                  >
                    <CameraOffAvatar
                      name={mainAvatar.name}
                      initials={mainAvatar.initials}
                      imageUrl={mainAvatar.imageUrl}
                      sizeClass="h-16 w-16 sm:h-[4.5rem] sm:w-[4.5rem] md:h-20 md:w-20"
                    />
                  </TileSpeakingRings>
                </div>
              )}
            </div>
            <div className="pointer-events-none absolute inset-x-0 bottom-0 z-[1] bg-linear-to-t from-black/85 via-black/40 to-transparent px-2 pb-2 pt-6">
              <div className="flex items-center gap-1.5">
                {dockStage.stageBadge === "sharing" ? (
                  <Monitor size={11} className="shrink-0 text-emerald-300/90" />
                ) : (
                  <Video size={11} className="shrink-0 text-white/70" />
                )}
                <span className="truncate text-[10px] font-medium text-white/90 sm:text-[11px]">
                  {dockStage.stageBadge === "sharing" ? "Screen share" : dockStage.headerLabel}
                </span>
              </div>
            </div>
          </div>

          <div className={cn(tileShell, "min-h-0")} aria-label={dockStage.sideStrip.label}>
            <div className="pointer-events-none border-b border-white/10 bg-black/50 px-1 py-1 text-center">
              <span className="line-clamp-1 text-[8px] font-semibold uppercase tracking-wide text-white/60">
                {dockStage.sideStrip.label}
              </span>
            </div>
            <div className="relative min-h-0 flex-1">
              {dockStage.sideStrip.videoLive ? (
                <MinimizedDockVideoFromSink
                  stream={sideStripStream}
                  attachRevision={sideAttachKey}
                  mirrored={dockStage.sideStrip.mirrorVideo}
                  videoVisible
                  visibleClassName="pointer-events-none absolute inset-0 h-full w-full object-cover"
                  audioOnlyClassName="pointer-events-none absolute h-px w-px overflow-hidden opacity-0"
                />
              ) : (
                <div className="flex h-full min-h-16 items-center justify-center bg-zinc-950/90">
                  <TileSpeakingRings stream={sideStripMicMuted ? null : sideStripStream}>
                    <CameraOffAvatar
                      name={dockStage.sideStrip.label}
                      initials={
                        displayInitials(dockStage.sideStrip.label).slice(0, 2) || "?"
                      }
                      imageUrl={
                        sideStripRemote?.peer.image?.trim()
                          ? sideStripRemote.peer.image
                          : dockStage.sideStrip.mirrorVideo
                            ? localProfileImageUrl
                            : null
                      }
                      sizeClass="h-11 w-11 sm:h-12 sm:w-12"
                    />
                  </TileSpeakingRings>
                </div>
              )}
            </div>
          </div>
        </div>

        <div
          className="pointer-events-none absolute inset-x-0 top-0 flex items-start justify-between gap-2 bg-linear-to-b from-black/80 to-transparent px-2 pb-12 pt-2 sm:px-3 sm:pb-14 sm:pt-2.5"
          style={{ userSelect: "none" }}
        >
          <div className="flex min-w-0 items-center gap-1.5 pt-0.5">
            <p
              className="truncate pl-0.5 text-[11px] font-semibold text-white/95 sm:text-xs md:text-[13px]"
              aria-live="polite"
            >
              {dockStage.headerLabel}
            </p>
            {dockStage.mainParticipant ? (
              <span className="flex shrink-0 items-center gap-0.5">
                {dockStage.mainParticipant.peer.micActive === false ? (
                  <span
                    className="flex h-6 w-6 items-center justify-center rounded-full bg-black/55 ring-1 ring-white/12"
                    title="Their microphone is off"
                  >
                    <MicOff size={12} className="text-amber-200" strokeWidth={2.25} />
                  </span>
                ) : null}
                {dockStage.mainParticipant.peer.cameraActive === false ? (
                  <span
                    className="flex h-6 w-6 items-center justify-center rounded-full bg-black/55 ring-1 ring-white/12"
                    title="Their camera is off"
                  >
                    <VideoOff size={12} className="text-amber-200" strokeWidth={2.25} />
                  </span>
                ) : null}
              </span>
            ) : null}
          </div>
          <div className="pointer-events-auto flex max-w-[min(100%,18rem)] shrink-0 flex-wrap items-center justify-end gap-1 sm:gap-1.5">
            <button
              type="button"
              aria-label={micEnabled ? "Mute" : "Unmute"}
              title={micEnabled ? "Mute" : "Unmute"}
              disabled={!mediaControlsReady}
              onClick={toggleMic}
              onPointerDown={(e) => e.stopPropagation()}
              className={cn(
                "flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-full text-white/90 hover:bg-white/10 sm:h-9 sm:w-9",
                !mediaControlsReady && "cursor-not-allowed opacity-40 hover:bg-transparent",
              )}
              style={{
                background: "rgba(0,0,0,0.5)",
                border: "1px solid rgba(255,255,255,0.12)",
                backdropFilter: "blur(6px)",
              }}
            >
              {micEnabled ? (
                <Mic size={15} strokeWidth={2} className="sm:h-4 sm:w-4" />
              ) : (
                <MicOff size={15} strokeWidth={2} className="sm:h-4 sm:w-4 text-amber-200" />
              )}
            </button>
            <button
              type="button"
              aria-label={cameraEnabled ? "Stop video" : "Start video"}
              title={cameraEnabled ? "Stop video" : "Start video"}
              disabled={!mediaControlsReady}
              onClick={toggleCamera}
              onPointerDown={(e) => e.stopPropagation()}
              className={cn(
                "flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-full text-white/90 hover:bg-white/10 sm:h-9 sm:w-9",
                !mediaControlsReady && "cursor-not-allowed opacity-40 hover:bg-transparent",
              )}
              style={{
                background: "rgba(0,0,0,0.5)",
                border: "1px solid rgba(255,255,255,0.12)",
                backdropFilter: "blur(6px)",
              }}
            >
              {cameraEnabled ? (
                <Video size={15} strokeWidth={2} className="sm:h-4 sm:w-4" />
              ) : (
                <VideoOff size={15} strokeWidth={2} className="sm:h-4 sm:w-4 text-amber-200" />
              )}
            </button>
            {showScreenShareInDock ? (
              <button
                type="button"
                aria-label={screenSharing ? "Stop sharing" : "Share screen"}
                title={screenSharing ? "Stop sharing" : "Share screen"}
                disabled={!mediaControlsReady}
                onClick={toggleScreenShare}
                onPointerDown={(e) => e.stopPropagation()}
                className={cn(
                  "flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-full text-white/90 hover:bg-white/10 sm:h-9 sm:w-9",
                  !mediaControlsReady && "cursor-not-allowed opacity-40 hover:bg-transparent",
                )}
                style={{
                  background: "rgba(0,0,0,0.5)",
                  border: "1px solid rgba(255,255,255,0.12)",
                  backdropFilter: "blur(6px)",
                }}
              >
                {screenSharing ? (
                  <Monitor size={15} strokeWidth={2} className="sm:h-4 sm:w-4" />
                ) : (
                  <MonitorOff size={15} strokeWidth={2} className="sm:h-4 sm:w-4 text-amber-200" />
                )}
              </button>
            ) : null}
            <div
              className="rounded-full px-2 py-0.5 font-mono text-[10px] font-semibold text-white/85 sm:text-[11px]"
              style={{
                background: "rgba(0,0,0,0.5)",
                border: "1px solid rgba(255,255,255,0.12)",
              }}
            >
              {formatCallDuration(elapsed)}
            </div>
            <button
              type="button"
              aria-label="Return to full call"
              title="Return to full call"
              onClick={handleExpand}
              onPointerDown={(e) => e.stopPropagation()}
              className="flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-full text-white/90 hover:bg-white/10 sm:h-9 sm:w-9"
              style={{
                background: "rgba(0,0,0,0.5)",
                border: "1px solid rgba(255,255,255,0.12)",
                backdropFilter: "blur(6px)",
              }}
            >
              <SquareArrowOutUpRight size={15} strokeWidth={2} className="sm:h-4 sm:w-4" />
            </button>
          </div>
        </div>
      </div>

      {localMediaDeviceError ? (
        <div
          className="flex items-center justify-between gap-2 border-t border-amber-500/25 bg-amber-950/80 px-2.5 py-1.5 sm:px-3"
          role="alert"
        >
          <p className="min-w-0 flex-1 text-[10px] leading-snug text-amber-100/95 sm:text-[11px]">
            {localMediaDeviceError}
          </p>
          <button
            type="button"
            onClick={clearLocalMediaDeviceError}
            className="shrink-0 text-[10px] font-medium text-amber-200 underline-offset-2 hover:underline sm:text-[11px]"
          >
            Dismiss
          </button>
        </div>
      ) : null}

      <div className="flex items-center justify-center gap-3 border-t border-white/10 px-2.5 py-3 sm:gap-3 sm:px-4 sm:py-3.5">
        {rtcRoomType !== "circle" && !dockSessionIsCircle ? (
          <button
            type="button"
            onClick={handleSkip}
            className="flex min-h-[44px] min-w-[6.5rem] shrink-0 flex-col items-center justify-center gap-1 rounded-xl border border-white/15 bg-white/5 px-4 py-1.5 text-white/85 hover:bg-white/10 sm:min-h-0 sm:flex-row sm:gap-2 sm:px-5 sm:py-2.5"
          >
            <SkipForward size={18} className="shrink-0 sm:size-[18px]" />
            <span className="text-[10px] font-medium sm:text-xs">Skip</span>
          </button>
        ) : null}
        <button
          type="button"
          onClick={handleEnd}
          className="flex min-h-[44px] min-w-[6.5rem] shrink-0 cursor-pointer flex-col items-center justify-center gap-1 rounded-xl bg-red-500 px-4 py-1.5 text-white hover:bg-red-400 sm:min-h-0 sm:flex-row sm:gap-2 sm:px-5 sm:py-2.5"
        >
          <PhoneOff size={18} className="shrink-0 sm:size-[18px]" />
          <span className="text-[10px] font-medium sm:text-xs">End</span>
        </button>
      </div>
    </div>
  );
}

/**
 * Floating call UI when the session is minimized. Cheap gate: no dock hooks on `/circle/...` full room.
 */
export function MinimizedRoomDock() {
  const pathname = usePathname();
  const isActive = useAppSelector(selectIsVideoSessionActive);
  const isMinimized = useAppSelector(selectIsRoomMinimized);
  const isFullRoom = pathname.startsWith("/circle/");
  if (!isActive || !isMinimized || isFullRoom) return null;
  return <MinimizedRoomDockPanel />;
}
