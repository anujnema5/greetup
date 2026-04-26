"use client";

import { useCallback, useRef } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAppDispatch, useAppSelector } from "@/lib/redux/hooks";
import {
  selectActiveRoomId,
  selectIsRoomMinimized,
  selectIsVideoSessionActive,
} from "@/lib/redux/selectors/room-selectors";
import { expandVideoSession } from "@/lib/redux/slices/room-slice";
import { clearRoomMinimized } from "@/features/room/lib/room-sync";
import { isCircleRoomData } from "@/features/matching";
import { useGetRoomQuery } from "@/features/room/api/room-api";
import { useRoomVideo } from "@/features/room/hooks/use-room-video";
import { MOCK_MATCH } from "@/features/room/constants/mock-match";
import {
  hasLiveEnabledVideo,
  hasLiveMedia,
  hasLiveVideo,
  useRtcSocketContext,
} from "@/features/rtc";
import { canUseScreenShare } from "@/features/rtc/lib/screen-share-policy";
import { cn } from "@/lib/utils";
import {
  Maximize2,
  Mic,
  MicOff,
  Monitor,
  MonitorOff,
  PhoneOff,
  SkipForward,
  Video,
  VideoOff,
} from "lucide-react";
import { useAttachMediaStream } from "@/features/room/hooks/use-attach-media-stream";
import { useCallElapsedSeconds } from "@/features/room/hooks/use-call-elapsed-seconds";
import {
  MINIMIZED_DOCK_OFFSET_STORAGE_KEY,
  useMinimizedDockDrag,
} from "@/features/room/hooks/use-minimized-dock-drag";
import { formatCallDuration } from "@/features/room/lib/format-call-duration";

export function MinimizedRoomDock() {
  const router = useRouter();
  const pathname = usePathname();
  const dispatch = useAppDispatch();
  const isActive = useAppSelector(selectIsVideoSessionActive);
  const isMinimized = useAppSelector(selectIsRoomMinimized);
  const activeRoomId = useAppSelector(selectActiveRoomId);

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
    remotePeerCameraStream,
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

  const mediaControlsReady = mediasoupStatus === "ready";
  const screenShareAllowed = canUseScreenShare(rtcRoomType);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const peerCameraInsetRef = useRef<HTMLVideoElement>(null);
  const localVideoRef = useRef<HTMLVideoElement>(null);

  const remoteVideoLive = hasLiveVideo(remoteMediaStream);
  const remoteMediaLive = hasLiveMedia(remoteMediaStream);
  const localVideoLive = hasLiveEnabledVideo(localMediaStream);

  const peerCameraInsetStream =
    mainStageShowsScreen && remotePeerCameraStream && hasLiveVideo(remotePeerCameraStream)
      ? remotePeerCameraStream
      : null;
  const peerCameraInsetLive = hasLiveVideo(peerCameraInsetStream);

  useAttachMediaStream(remoteVideoRef, remoteMediaStream ?? null, remoteVideoLive);
  useAttachMediaStream(localVideoRef, localMediaStream ?? null, localVideoLive);
  useAttachMediaStream(peerCameraInsetRef, peerCameraInsetStream, peerCameraInsetLive);

  const isFullRoom = pathname.startsWith("/circle/");
  const visible = isActive && isMinimized && !isFullRoom;

  const cardRef = useRef<HTMLDivElement>(null);
  const elapsed = useCallElapsedSeconds(visible);
  const { onDragPointerDown, onDragPointerMove, onDragPointerUp } = useMinimizedDockDrag(
    cardRef,
    visible,
    elapsed,
  );

  const handleExpand = useCallback(() => {
    dispatch(expandVideoSession());
    clearRoomMinimized();
    if (activeRoomId) {
      router.push(`/circle/${activeRoomId}`);
    } else {
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

  if (!visible) return null;

  return (
    <div
      ref={cardRef}
      className={cn(
        "fixed z-200 flex max-h-[min(92dvh,calc(100vh-1rem))] flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-2xl max-md:rounded-xl",
        "w-[min(25rem,calc(100vw-1.25rem))]",
        "max-md:bottom-[5.25rem] max-md:right-3",
        "md:bottom-4 md:right-4",
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
          "h-[11rem] min-h-[11rem] sm:h-[12.75rem] sm:min-h-[12.75rem] md:h-[14rem] md:min-h-[14rem]",
        )}
      >
        <div className="flex h-full w-full min-w-0 flex-row overflow-hidden">
          <div className="relative min-h-0 min-w-0 flex-1">
            <div
              className="absolute inset-0"
              style={{
                background: `linear-gradient(145deg, ${MOCK_MATCH.gradFrom}40, var(--card) 45%, ${MOCK_MATCH.gradTo}35)`,
              }}
            />
            <div
              className="pointer-events-none absolute inset-0 opacity-[0.35]"
              style={{
                backgroundImage:
                  "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(255,255,255,0.03) 2px, rgba(255,255,255,0.03) 3px), repeating-linear-gradient(90deg, transparent, transparent 2px, rgba(255,255,255,0.02) 2px, rgba(255,255,255,0.02) 3px)",
              }}
            />
            {remoteMediaLive ? (
              <video
                ref={remoteVideoRef}
                playsInline
                autoPlay
                className={cn(
                  remoteVideoLive
                    ? "pointer-events-none absolute inset-0 h-full w-full"
                    : "pointer-events-none absolute h-px w-px overflow-hidden opacity-0",
                  remoteVideoLive &&
                    (mainStageShowsScreen ? "bg-black object-contain" : "object-cover"),
                )}
              />
            ) : null}
            {!remoteVideoLive && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div
                  className="relative flex h-[4.75rem] w-[4.75rem] items-center justify-center rounded-full text-2xl font-bold text-white shadow-lg sm:h-[5.25rem] sm:w-[5.25rem] sm:text-[1.75rem] md:h-[5.75rem] md:w-[5.75rem] md:text-3xl"
                  style={{
                    background: `linear-gradient(135deg, ${MOCK_MATCH.gradFrom}, ${MOCK_MATCH.gradTo})`,
                    boxShadow: `0 0 36px ${MOCK_MATCH.gradFrom}66`,
                  }}
                >
                  {MOCK_MATCH.initials}
                </div>
              </div>
            )}
          </div>
          {peerCameraInsetStream ? (
            <div
              className="flex w-[26%] max-w-[5.5rem] shrink-0 flex-col border-l border-white/15 bg-black/40"
              aria-label="Peer camera"
            >
              <div className="px-0.5 py-0.5 text-center">
                <span className="text-[7px] font-medium text-white/55">Peer</span>
              </div>
              <div className="relative min-h-0 flex-1 overflow-hidden">
                {peerCameraInsetLive ? (
                  <video
                    ref={peerCameraInsetRef}
                    playsInline
                    autoPlay
                    className="pointer-events-none h-full w-full object-cover"
                  />
                ) : (
                  <div
                    className="flex h-full w-full items-center justify-center"
                    style={{
                      background:
                        "linear-gradient(135deg, oklch(28% 0.04 105), oklch(18% 0.02 110))",
                    }}
                  >
                    <span className="text-[7px] text-white/40">—</span>
                  </div>
                )}
              </div>
            </div>
          ) : null}
          <div
            className={cn(
              "flex shrink-0 flex-col border-l border-white/15 bg-black/40",
              peerCameraInsetStream ? "w-[26%] max-w-[5.5rem]" : "w-[30%] max-w-[6.5rem]",
            )}
            aria-label="Your camera"
          >
            <div className="px-1 py-0.5 text-center">
              <span className="text-[8px] font-medium text-white/55">You</span>
            </div>
            <div className="relative min-h-0 flex-1 overflow-hidden">
              {localVideoLive ? (
                <video
                  ref={localVideoRef}
                  playsInline
                  autoPlay
                  muted
                  className="pointer-events-none h-full w-full object-cover"
                />
              ) : (
                <div
                  className="flex h-full w-full items-center justify-center"
                  style={{
                    background:
                      "linear-gradient(135deg, oklch(28% 0.04 105), oklch(18% 0.02 110))",
                  }}
                >
                  <div
                    className="flex h-7 w-7 items-center justify-center rounded-full text-[9px] font-bold sm:h-8 sm:w-8 sm:text-[10px]"
                    style={{
                      background:
                        "radial-gradient(circle at 40% 35%, oklch(90% 0.11 105), oklch(78% 0.10 105))",
                      color: "oklch(22% 0.03 110)",
                    }}
                  >
                    You
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
        <div
          className="pointer-events-none absolute inset-x-0 top-0 flex items-start justify-between gap-2 bg-gradient-to-b from-black/75 to-transparent px-3 pb-10 pt-2.5 sm:px-3.5 sm:pb-12 sm:pt-3"
          style={{ userSelect: "none" }}
        >
          <div className="flex min-w-0 items-center gap-2">
            <p className="truncate text-xs font-semibold text-white sm:text-[13px]">
              {MOCK_MATCH.name}
            </p>
          </div>
          <div className="pointer-events-auto flex shrink-0 items-center gap-1 sm:gap-1.5">
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
            {screenShareAllowed ? (
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
              className="rounded-full px-2 py-0.5 font-mono text-[11px] font-semibold text-white/85"
              style={{
                background: "rgba(0,0,0,0.5)",
                border: "1px solid rgba(255,255,255,0.12)",
              }}
            >
              {formatCallDuration(elapsed)}
            </div>
            <button
              type="button"
              aria-label="Open full call"
              onClick={handleExpand}
              onPointerDown={(e) => e.stopPropagation()}
              className="flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-full text-white/90 hover:bg-white/10 sm:h-9 sm:w-9"
              style={{
                background: "rgba(0,0,0,0.5)",
                border: "1px solid rgba(255,255,255,0.12)",
                backdropFilter: "blur(6px)",
              }}
            >
              <Maximize2 size={15} strokeWidth={2} className="sm:h-4 sm:w-4" />
            </button>
          </div>
        </div>
        <div className="pointer-events-none absolute bottom-2 left-2.5 flex items-center gap-1.5 rounded-md bg-black/35 px-2 py-1 backdrop-blur-sm sm:bottom-2.5 sm:left-3">
          <Video size={11} className="text-white/70" />
          <span className="text-[9px] font-medium text-white/65 sm:text-[10px]">Video</span>
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
