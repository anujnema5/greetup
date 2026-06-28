"use client";

import { useCallback, useMemo, useRef } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useSession } from "@/lib/auth-client";
import {
  selectActiveRoomId,
  selectDirectCallPeerLabel,
  selectIsRoomMinimized,
  selectIsVideoSessionActive,
  selectRoomPhase,
  selectRtcPrimaryRemoteUserId,
  useRoomStore,
} from "@/features/room/state/room.store";
import {
  SPACE_SEARCH_PATH,
  spaceRoomPath,
} from "@/features/room/lib/navigation/space-routes";
import {
  isPersistedSpaceSession,
  resolveSpaceHostUserId,
} from "@/features/matching/types/room.types";
import {
  isConnectionCallSession,
  isMatchSession,
} from "@/features/room/lib/session/room-session-kind";
import { useGetRoom } from "@/features/room/api/room.queries";
import { useRoomVideo } from "@/features/room/hooks/session/use-room-video";
import { useMinimizedDockMainStage } from "@/features/room/hooks/minimized-dock/use-minimized-dock-main-stage";
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
import { MinimizedDockVideoFromSink } from "@/features/room/components/minimized-dock/minimized-dock-video-sink";
import { useCallElapsedSeconds } from "@/features/room/hooks/media/use-call-elapsed-seconds";
import {
  MINIMIZED_DOCK_OFFSET_STORAGE_KEY,
  useMinimizedDockDrag,
} from "@/features/room/hooks/minimized-dock/use-minimized-dock-drag";
import { clearRoomMinimized } from "@/features/room/lib/session/room-sync";
import {
  LIVE_SPEAKER_TILE_RING,
  isLiveSpeakerOnTile,
} from "@/features/room/lib/call/active-speaker";
import {
  CameraOffAvatar,
  TileSpeakingRings,
} from "@/features/room/call/tiles/tile-primitives";
import { useRerenderOnVideoTrackMuteCycle } from "@/features/room/hooks/media/use-attach-media-stream";

function displayInitials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join("");
}

/** Heavy RTC + dock logic — only mounted when {@link MinimizedRoomDock} gate says minimized + off /space. */
function MinimizedRoomDockPanel() {
  const router = useRouter();
  const expandVideoSession = useRoomStore((s) => s.expandVideoSession);
  const isActive = useRoomStore(selectIsVideoSessionActive);
  const activeRoomId = useRoomStore(selectActiveRoomId);
  const roomPhase = useRoomStore(selectRoomPhase);
  const rtcPrimaryRemoteUserId = useRoomStore(selectRtcPrimaryRemoteUserId);
  const directCallPeerLabel = useRoomStore(selectDirectCallPeerLabel);
  const { data: session } = useSession();
  const currentUserId = session?.user?.id ?? null;
  const localProfileImageUrl = session?.user?.image ?? null;

  const {
    localMediaStream,
    remoteMediaStream,
    mainStageShowsScreen,
    remoteParticipants,
    remoteTrackMediaSource,
    dominantSpeakerPeerId: liveSpeakerPeerId,
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

  const { data: dockRoomMeta } = useGetRoom(activeRoomId ?? "", {
    enabled: Boolean(activeRoomId) && isActive,
  });
  const dockSessionIsSpace = isPersistedSpaceSession(dockRoomMeta, rtcRoomType);
  const dockSpaceHostId = resolveSpaceHostUserId(dockRoomMeta);
  const dockIsMatch = isMatchSession(dockRoomMeta);
  const dockIsConnectionCall = isConnectionCallSession(dockRoomMeta);
  const dockCanSkipAndRematch =
    dockIsMatch ||
    (roomPhase === "searching" && !dockSessionIsSpace && !dockIsConnectionCall);
  const dockConnectionConversationId =
    dockRoomMeta?.sessionKind === "connection_call"
      ? dockRoomMeta.conversationId ?? null
      : null;

  const { handleEnd: roomHandleEnd, handleSkip: roomHandleSkip } = useRoomVideo(
    activeRoomId ?? "",
    {
      skipSetup: true,
      isDbSpaceCall: dockSessionIsSpace,
      spaceHostUserId: dockSpaceHostId,
      canSkipAndRematch: dockCanSkipAndRematch,
      isConnectionCallSession: dockIsConnectionCall,
      connectionCallConversationId: dockConnectionConversationId,
    },
  );

  const dockStage = useMinimizedDockMainStage({
    mainStageShowsScreen,
    remoteMediaStream,
    remoteParticipants,
    remoteTrackMediaSource,
    liveSpeakerPeerId,
    rtcRoomType,
    rtcPrimaryRemoteUserId,
    currentUserId,
    localMediaStream,
    cameraEnabled,
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

  const mainTileIsLiveSpeaker =
    !dockStage.mainStageShowsScreen &&
    Boolean(
      dockStage.mainFocusPeerId &&
        isLiveSpeakerOnTile(liveSpeakerPeerId, dockStage.mainFocusPeerId),
    );

  /** PiP column shows self (incl. screen-share) vs remote — nudge column split so local is slightly wider, remote strip slightly narrower when swapped. */
  const dockStripShowsLocalSelf = dockStage.sideStrip.label === "You";

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
    expandVideoSession();
    // Keep `ROOM_MINIMIZED_KEY` until `/space` mounts `InCallContainer` (`useRoomVideo` clears it).
    // Clearing here runs before navigation; `useRoomPageTabLease` cleanup then thinks we fully
    // left the room and dispatches `resetRoomState()`, which tears down RTC and forces re-join.
    if (roomPhase === "searching") {
      router.push(SPACE_SEARCH_PATH);
    } else if (activeRoomId) {
      router.push(spaceRoomPath(activeRoomId));
    } else {
      clearRoomMinimized();
      router.push("/home");
    }
  }, [expandVideoSession, router, activeRoomId, roomPhase]);

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

  /** Matches `MOCK_MATCH` gradient in `mock-match.ts` — keep in sync if those tokens change. */
  const dockMainTileGrad =
    "bg-[linear-gradient(145deg,rgb(124_58_237/0.21),var(--card)_40%,rgb(79_70_229/0.19))]";
  const dockMainTileGridNoise =
    "bg-[repeating-linear-gradient(0deg,transparent,transparent_2px,rgba(255,255,255,0.03)_2px,rgba(255,255,255,0.03)_3px),repeating-linear-gradient(90deg,transparent,transparent_2px,rgba(255,255,255,0.02)_2px,rgba(255,255,255,0.02)_3px)]";

  const dockFooterControlSurface =
    "bg-black/50 border border-white/12 backdrop-blur-[6px]";

  const dockExpandCallBtnClass =
    "box-border inline-flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-xl border border-white/25 bg-black/55 p-1 leading-none text-white shadow-lg backdrop-blur-md transition-colors hover:bg-black/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40";

  return (
    <div
      className={cn(
        "fixed z-200 max-md:left-1/2 max-md:-translate-x-1/2 max-md:right-auto max-md:bottom-[5.25rem]",
        "md:bottom-4 md:right-4 md:left-auto",
        "w-[min(18.5rem,calc(100vw-1rem))] md:w-[min(28rem,calc(100vw-1.25rem))]",
      )}
    >
      <div
        ref={cardRef}
        className={cn(
          "flex max-h-[min(88dvh,calc(100vh-1rem))] w-full touch-manipulation flex-col overflow-hidden rounded-2xl border border-border bg-card/95 shadow-[0_16px_48px_rgba(0,0,0,0.5),0_0_0_1px_rgba(255,255,255,0.06)] backdrop-blur-md max-md:rounded-xl",
        )}
      >
      <div
        aria-label="Move call window"
        onPointerDown={onDragPointerDown}
        onPointerMove={onDragPointerMove}
        onPointerUp={onDragPointerUp}
        onPointerCancel={onDragPointerUp}
        className={cn(
          "relative w-full shrink-0 cursor-pointer overflow-hidden select-none touch-none [&_*]:cursor-pointer",
          "min-h-[9.75rem] sm:min-h-[12.5rem] md:min-h-[15rem]",
        )}
      >
        <button
          type="button"
          aria-label="Return to full call"
          title="Return to full call"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={handleExpand}
          className={cn(
            dockExpandCallBtnClass,
            "absolute z-[2] top-3 right-3 sm:top-3.5 sm:right-3.5 md:top-4 md:right-4",
            "pointer-events-auto touch-manipulation",
          )}
        >
          <SquareArrowOutUpRight size={14} strokeWidth={2} className="block shrink-0" aria-hidden />
        </button>
        <div
          className={cn(
            "grid h-full min-h-[inherit] w-full min-w-0 gap-1 p-1.5 sm:gap-2 sm:p-2.5",
            dockStripShowsLocalSelf
              ? "grid-cols-[minmax(0,1fr)_minmax(5.25rem,36%)] sm:grid-cols-[minmax(0,1fr)_9rem]"
              : "grid-cols-[minmax(0,1fr)_minmax(3.5rem,20%)] sm:grid-cols-[minmax(0,1fr)_5.5rem]",
          )}
        >
          <div
            className={cn(
              tileShell,
              "min-h-[8rem] sm:min-h-[10.5rem] md:min-h-[11.5rem]",
              mainTileIsLiveSpeaker && LIVE_SPEAKER_TILE_RING,
            )}
          >
            <div className="absolute inset-0 overflow-hidden rounded-[inherit]">
              <div className={cn("absolute inset-0", dockMainTileGrad)} />
              <div
                className={cn(
                  "pointer-events-none absolute inset-0 opacity-[0.28]",
                  dockMainTileGridNoise,
                )}
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
                <div className="absolute inset-0 flex items-center justify-center bg-muted/20">
                  <TileSpeakingRings
                    stream={mainAvatar.micOff === true ? null : mainAvatar.stream}
                  >
                    <CameraOffAvatar
                      name={mainAvatar.name}
                      initials={mainAvatar.initials}
                      imageUrl={mainAvatar.imageUrl}
                      sizeClass="h-14 w-14 sm:h-16 sm:w-16 md:h-20 md:w-20"
                    />
                  </TileSpeakingRings>
                </div>
              )}
            </div>
            <div className="pointer-events-none absolute inset-x-0 bottom-0 z-[1] bg-linear-to-t from-black/85 via-black/40 to-transparent px-2 pb-2 pt-6">
              <div className="flex min-w-0 items-center gap-1.5">
                {dockStage.stageBadge === "sharing" ? (
                  <Monitor size={11} className="shrink-0 text-emerald-300/90" />
                ) : (
                  <Video size={11} className="shrink-0 text-white/70" />
                )}
                <span
                  className="min-w-0 truncate text-[10px] font-medium text-white/90 sm:text-[11px]"
                  aria-live="polite"
                >
                  {dockStage.stageBadge === "sharing" ? "Screen share" : dockStage.headerLabel}
                </span>
                {dockStage.mainParticipant ? (
                  <span className="ml-auto flex shrink-0 items-center gap-0.5">
                    {dockStage.mainParticipant.peer.micActive === false ? (
                      <span
                        className="flex h-5 w-5 items-center justify-center rounded-full bg-black/55 ring-1 ring-white/12 sm:h-6 sm:w-6"
                        title="Their microphone is off"
                      >
                        <MicOff size={11} className="text-amber-200 sm:h-3 sm:w-3" strokeWidth={2.25} />
                      </span>
                    ) : null}
                    {dockStage.mainParticipant.peer.cameraActive === false ? (
                      <span
                        className="flex h-5 w-5 items-center justify-center rounded-full bg-black/55 ring-1 ring-white/12 sm:h-6 sm:w-6"
                        title="Their camera is off"
                      >
                        <VideoOff size={11} className="text-amber-200 sm:h-3 sm:w-3" strokeWidth={2.25} />
                      </span>
                    ) : null}
                  </span>
                ) : null}
              </div>
            </div>
          </div>

          <div
            className={cn(tileShell, "relative h-full min-h-0")}
            aria-label={dockStage.sideStrip.label}
          >
            <div className="absolute inset-0 overflow-hidden rounded-[inherit]">
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
                <div className="absolute inset-0 flex items-center justify-center bg-muted/20">
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
                      sizeClass="h-12 w-12 sm:h-14 sm:w-14"
                    />
                  </TileSpeakingRings>
                </div>
              )}
            </div>
            <div className="pointer-events-none absolute inset-x-0 bottom-0 z-[1] bg-linear-to-t from-black/85 via-black/40 to-transparent px-1.5 pb-1.5 pt-5 sm:px-2 sm:pb-2 sm:pt-6">
              <div className="flex min-w-0 items-center gap-1 sm:gap-1.5">
                <Video size={11} className="shrink-0 text-white/70" />
                <span className="line-clamp-1 min-w-0 truncate text-[9px] font-medium text-white/90 sm:text-[10px] sm:font-semibold">
                  {dockStage.sideStrip.label}
                </span>
              </div>
            </div>
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

      <div className="flex w-full min-w-0 items-center justify-between gap-2 border-t border-white/10 px-1.5 py-1.5 sm:gap-3 sm:px-4 sm:py-3.5">
        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-1 sm:gap-1.5">
          <button
            type="button"
            aria-label={micEnabled ? "Mute" : "Unmute"}
            title={micEnabled ? "Mute" : "Unmute"}
            disabled={!mediaControlsReady}
            onClick={toggleMic}
            className={cn(
              "flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-full text-white/90 hover:bg-white/10 sm:h-9 sm:w-9",
              dockFooterControlSurface,
              !mediaControlsReady && "cursor-not-allowed opacity-40 hover:bg-transparent",
            )}
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
            className={cn(
              "flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-full text-white/90 hover:bg-white/10 sm:h-9 sm:w-9",
              dockFooterControlSurface,
              !mediaControlsReady && "cursor-not-allowed opacity-40 hover:bg-transparent",
            )}
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
              className={cn(
                "flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-full text-white/90 hover:bg-white/10 sm:h-9 sm:w-9",
                dockFooterControlSurface,
                !mediaControlsReady && "cursor-not-allowed opacity-40 hover:bg-transparent",
              )}
            >
              {screenSharing ? (
                <Monitor size={15} strokeWidth={2} className="sm:h-4 sm:w-4" />
              ) : (
                <MonitorOff size={15} strokeWidth={2} className="sm:h-4 sm:w-4 text-amber-200" />
              )}
            </button>
          ) : null}
        </div>
        <div className="flex shrink-0 items-center justify-end gap-1 sm:gap-3">
          {dockCanSkipAndRematch ? (
            <button
              type="button"
              onClick={handleSkip}
              className="flex h-7 min-h-7 shrink-0 flex-row items-center justify-center gap-1 rounded-md border border-white/15 bg-white/5 px-2 py-0 text-white/85 hover:bg-white/10 sm:h-auto sm:min-h-0 sm:gap-2 sm:rounded-xl sm:px-5 sm:py-2.5"
            >
              <SkipForward className="h-3 w-3 shrink-0 sm:h-[18px] sm:w-[18px]" />
              <span className="text-[9px] font-medium sm:text-xs">Skip</span>
            </button>
          ) : null}
          <button
            type="button"
            onClick={handleEnd}
            className="flex h-7 min-h-7 shrink-0 cursor-pointer flex-row items-center justify-center gap-1 rounded-md bg-red-500 px-2 py-0 text-white hover:bg-red-400 sm:h-auto sm:min-h-0 sm:gap-2 sm:rounded-xl sm:px-5 sm:py-2.5"
          >
            <PhoneOff className="h-3 w-3 shrink-0 sm:h-[18px] sm:w-[18px]" />
            <span className="text-[9px] font-medium sm:text-xs">End</span>
          </button>
        </div>
      </div>
      </div>
    </div>
  );
}

/**
 * Floating call UI when the session is minimized. Cheap gate: no dock hooks on `/space/...` full room.
 */
export function MinimizedRoomDock() {
  const pathname = usePathname();
  const isActive = useRoomStore(selectIsVideoSessionActive);
  const isMinimized = useRoomStore(selectIsRoomMinimized);
  const isFullRoom = pathname.startsWith("/space/") || pathname.startsWith("/space/");
  if (!isActive || !isMinimized || isFullRoom) return null;
  return <MinimizedRoomDockPanel />;
}
