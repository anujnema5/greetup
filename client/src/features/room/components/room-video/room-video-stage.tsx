"use client";

/**
 * Renders the in-call media stage (everything inside the black rounded frame).
 *
 * Layout map:
 * - **Off-screen sinks** — Two hidden `<video>` elements hold `srcObject` for `remoteVideoRef` /
 *   `localVideoRef`; visible UI uses `VideoMirror` or separate refs that copy those streams.
 * - **Circle + screen share** — Either full-bleed screen only (`participantVideosInSidebar`) or
 *   stacked “main share + participant grid” (narrow / undocked).
 * - **Circle, cameras only** — Responsive grid of remote tiles + local “You” tile.
 * - **Direct** — 1:1 split (camera/camera or screen+rail), or 16:9 / activity scroll regions.
 *
 * `participantVideosInSidebar` is owned by `RoomVideoView`: when true, cameras live only in the
 * People panel and the stage is screen-only (typically desktop during share). Below `md`, it is
 * false during share so participants stay on the main stage (stacked / grid — see compact layouts).
 */
import { useRef, type RefObject } from "react";
import { cn } from "@/lib/utils";
import { CircleGalleryGrid } from "@/features/room/components/room-video/circle-gallery-grid";
import type { RoomActivityId } from "@/features/room/types/room-activity.types";
import type { RoomActivityMeta } from "@/features/room/types/room-activity.types";
import { ActivityStage } from "@/features/room/components/room-activity/activity-stage";
import type { RoomActiveActivity } from "@/lib/redux/types/room-slice.types";
import { RemoteParticipantTile } from "@/features/room/components/room-video/remote-participant-tile";
import {
  CameraOffAvatar,
  NoPeerAvailableState,
  SearchingCandidateState,
  TileMediaStatus,
  TileNameBadge,
  TileSpeakingRings,
  VideoMirror,
} from "@/features/room/components/room-video/room-video-primitives";
import type { RemoteParticipant, ScreenShareTileInfo } from "@/features/rtc";
import { hasLiveEnabledVideo, hasLiveVideo } from "@/features/rtc";
import { useAttachMediaStream } from "@/features/room/hooks/use-attach-media-stream";
import { ScreenShareFilmstrip } from "@/features/room/components/room-video/screen-share-filmstrip";
import { ScreenShareMobileParticipantGrid } from "@/features/room/components/room-video/screen-share-mobile-participant-grid";

type StageRatio = "16:9" | "1:1";

/** Grid columns for circle room: tile count = you + each `RemoteParticipant`. */
function circleGalleryGridClass(groupTileCount: number): string {
  if (groupTileCount === 1) return "grid-cols-1";
  // 2 people: stacked on phone (portrait faces fill half the screen each), side-by-side on tablet+
  if (groupTileCount === 2) return "grid-cols-1 sm:grid-cols-2";
  // 3 people: 2+1 on phone (last tile full-width for balance), featured layout on md+
  if (groupTileCount === 3)
    return "grid-cols-2 [&>*:last-child]:col-span-2 md:[&>*:last-child]:col-auto md:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]";
  // 4 people: 2×2 on all sizes
  if (groupTileCount <= 4) return "grid-cols-2";
  // 5–6 people: 2 cols on phone, 3 on md+ (tablet landscape / desktop)
  if (groupTileCount <= 6) return "grid-cols-2 md:grid-cols-3";
  // 7–9 people: 2 cols on phone, 3 on sm+ tablet, 4 on large desktop
  if (groupTileCount <= 9) return "grid-cols-2 sm:grid-cols-3 lg:grid-cols-4";
  // 10+ people: 2 → 3 → 4 → 5 columns across breakpoints
  return "grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5";
}

export function RoomVideoStage({
  isGroupRoom,
  groupGalleryParticipants,
  remoteVideoRef,
  localVideoRef,
  showSearchingState,
  directCallMatchSearchFailed,
  directCallMatchSearchError,
  onRetryDirectCallMatchSearch,
  stageRatio,
  activeActivity,
  activeActivityMeta,
  setActiveActivity,
  activeRealtimeActivity,
  onEndActiveGame,
  onOfferDrawGame,
  remoteVideoLive,
  localVideoLive,
  remoteStream,
  localStream,
  mainStageShowsScreen,
  peerLabel,
  peerInitials,
  myName,
  currentUserId,
  myInitial,
  peerAvatarUrl,
  myAvatarUrl,
  micEnabled,
  cameraEnabled,
  remoteCameraOff,
  remoteMicOff,
  screenShareMainLayout = false,
  screenShareTiles = [],
  focusedScreenShareKey = null,
  onSelectScreenShare,
  remotePeerCameraStream = null,
  /** Cameras live in People panel/sheet; stage is screen-only. */
  participantVideosInSidebar = false,
  /**
   * Fullscreen / immersive stage on narrow + screen share while cameras are still on-stage:
   * show only the shared screen (not peer/local tiles beside or below it).
   */
  shareStageImmersive = false,
}: {
  isGroupRoom: boolean;
  groupGalleryParticipants: RemoteParticipant[];
  remoteVideoRef: RefObject<HTMLVideoElement | null>;
  localVideoRef: RefObject<HTMLVideoElement | null>;
  showSearchingState: boolean;
  directCallMatchSearchFailed: boolean;
  directCallMatchSearchError: string | null;
  onRetryDirectCallMatchSearch: () => void;
  stageRatio: StageRatio;
  activeActivity: RoomActivityId | null;
  activeActivityMeta: RoomActivityMeta | null;
  setActiveActivity: (activity: RoomActivityId | null) => void;
  activeRealtimeActivity: RoomActiveActivity | null;
  onEndActiveGame?: () => void;
  onOfferDrawGame?: () => void;
  remoteVideoLive: boolean;
  localVideoLive: boolean;
  remoteStream: MediaStream | null;
  localStream: MediaStream | null;
  mainStageShowsScreen: boolean;
  peerLabel: string;
  peerInitials: string;
  myName: string;
  currentUserId?: string | null;
  myInitial: string;
  peerAvatarUrl?: string | null;
  myAvatarUrl?: string | null;
  micEnabled?: boolean;
  cameraEnabled?: boolean;
  remoteCameraOff?: boolean;
  remoteMicOff?: boolean;
  /** Circle: big screen-share stage + participant strip. */
  screenShareMainLayout?: boolean;
  screenShareTiles?: ScreenShareTileInfo[];
  focusedScreenShareKey?: string | null;
  onSelectScreenShare?: (key: string) => void;
  /** Direct + screen share: partner camera-only stream for the side rail (not the main stage). */
  remotePeerCameraStream?: MediaStream | null;
  participantVideosInSidebar?: boolean;
  shareStageImmersive?: boolean;
}) {
  const stageActivity = activeRealtimeActivity?.kind === "chess" ? "chess" : activeActivity;

  /** Direct 1:1 while a screen share exists: main tile is the share; rail shows cameras unless they moved to the sidebar. */
  const directScreenShareSidebar =
    !isGroupRoom &&
    !stageActivity &&
    stageRatio === "1:1" &&
    (mainStageShowsScreen || screenShareTiles.length > 0);

  const sidebarRemoteVideoRef = useRef<HTMLVideoElement>(null);
  const sidebarLocalVideoRef = useRef<HTMLVideoElement>(null);

  const sidebarRemoteStream = directScreenShareSidebar ? remotePeerCameraStream : null;
  const sidebarRemoteLive =
    Boolean(sidebarRemoteStream) && hasLiveVideo(sidebarRemoteStream) && !remoteCameraOff;
  const sidebarLocalLive = directScreenShareSidebar && hasLiveEnabledVideo(localStream);

  useAttachMediaStream(sidebarRemoteVideoRef, sidebarRemoteStream, sidebarRemoteLive);
  useAttachMediaStream(sidebarLocalVideoRef, directScreenShareSidebar ? localStream : null, sidebarLocalLive);

  const groupTileCount = groupGalleryParticipants.length + 1;
  const featuredParticipant =
    screenShareMainLayout || groupTileCount !== 3 ? null : (groupGalleryParticipants[0] ?? null);
  const sideParticipants =
    featuredParticipant == null
      ? groupGalleryParticipants
      : groupGalleryParticipants.filter((p) => p.peer.peerId !== featuredParticipant.peer.peerId);
  const groupGridClass = circleGalleryGridClass(groupTileCount);

  return (
    <>
      {/* --- Off-screen decode sinks: 1×1 videos are often throttled in Chrome → black mirrors/tiles --- */}
      <video
        ref={remoteVideoRef}
        playsInline
        autoPlay
        muted
        className="pointer-events-none fixed top-0 left-[-9999px] z-[-1] h-[180px] w-[320px] opacity-0"
        aria-hidden
      />
      <video
        ref={localVideoRef}
        playsInline
        autoPlay
        muted
        className="pointer-events-none fixed top-0 left-[-9999px] z-[-1] h-[180px] w-[320px] opacity-0"
        style={{ transform: "scaleX(-1)" }}
        aria-hidden
      />

      {/* --- Circle rooms --- */}
      {isGroupRoom ? (
        screenShareMainLayout ? (
          /* Circle + share: full-bleed stage when cameras are in the People panel/sheet. */
          participantVideosInSidebar ? (
            <div className="absolute inset-0 flex min-h-0 flex-col p-0 md:p-1 md:pt-1">
              <div className="relative min-h-0 flex-1 overflow-hidden rounded-none border-0 bg-black shadow-none md:rounded-xl md:border md:border-border/50 md:shadow-sm">
                <VideoMirror
                  srcRef={remoteVideoRef}
                  className={cn(
                    "absolute inset-0 h-full w-full",
                    remoteVideoLive
                      ? mainStageShowsScreen
                        ? "bg-black object-contain"
                        : "object-cover"
                      : "opacity-0",
                  )}
                />
                {!remoteVideoLive ? (
                  <div className="flex h-full items-center justify-center text-sm text-white/60">
                    Waiting for screen…
                  </div>
                ) : null}
              </div>
            </div>
          ) : (
            /* Circle + share (narrow / on-stage): shared screen + 2×2 participant grid (+ pages if 5+). */
            <div
              className={cn(
                "absolute inset-0 flex min-h-0 flex-col gap-1.5 p-1 md:p-1.5",
                shareStageImmersive && "gap-0 p-0",
              )}
            >
              <div
                className={cn(
                  "relative min-h-0 overflow-hidden rounded-xl border border-border/50 bg-black shadow-sm",
                  shareStageImmersive ? "flex-1 rounded-none border-0 shadow-none" : "flex-[1.12]",
                )}
              >
                <VideoMirror
                  srcRef={remoteVideoRef}
                  className={cn(
                    "absolute inset-0 h-full w-full",
                    remoteVideoLive
                      ? mainStageShowsScreen
                        ? "bg-black object-contain"
                        : "object-cover"
                      : "opacity-0",
                  )}
                />
                {!remoteVideoLive ? (
                  <div className="flex h-full items-center justify-center text-sm text-white/60">
                    Waiting for screen…
                  </div>
                ) : null}
                {onSelectScreenShare ? (
                  <ScreenShareFilmstrip
                    tiles={screenShareTiles}
                    focusedKey={focusedScreenShareKey}
                    onSelect={onSelectScreenShare}
                    className="absolute bottom-2 left-2 right-2 z-10 max-h-[40%]"
                  />
                ) : null}
              </div>
              {!shareStageImmersive ? (
                <ScreenShareMobileParticipantGrid
                  localVideoRef={localVideoRef}
                  localVideoLive={localVideoLive}
                  localStream={localStream}
                  myName={myName}
                  myInitial={myInitial}
                  myAvatarUrl={myAvatarUrl}
                  micEnabled={micEnabled ?? true}
                  cameraEnabled={cameraEnabled ?? true}
                  remoteParticipants={sideParticipants}
                  className="min-h-0"
                />
              ) : null}
            </div>
          )
        ) : groupTileCount > 6 ? (
          /* 7+ participants: paginated gallery — no Y-scroll, left/right pages */
          <CircleGalleryGrid
            participants={groupGalleryParticipants}
            localVideoRef={localVideoRef}
            localVideoLive={localVideoLive}
            localStream={localStream}
            myName={myName}
            myInitial={myInitial}
            myAvatarUrl={myAvatarUrl}
            micEnabled={micEnabled}
            cameraEnabled={cameraEnabled}
          />
        ) : (
          /* 1–6 participants: adaptive single-page grid (featured layout for 3, 2×2 for 4, etc.) */
          <div className="absolute inset-0 overflow-y-auto p-1 md:p-1.5">
            <div className={cn("grid h-full min-h-0 auto-rows-fr gap-1 md:gap-1", groupGridClass)}>
              {featuredParticipant ? (
                <RemoteParticipantTile participant={featuredParticipant} className="md:row-span-2" />
              ) : null}
              <div className="relative flex min-h-22 min-w-0 flex-col overflow-hidden rounded-xl border border-border/50 shadow-sm">
                <VideoMirror
                  srcRef={localVideoRef}
                  mirrored
                  className={cn(
                    "absolute inset-0 h-full w-full object-cover",
                    !localVideoLive && "opacity-0",
                  )}
                />
                {!localVideoLive ? (
                  <div className="flex h-full w-full flex-1 items-center justify-center bg-muted/20">
                    <TileSpeakingRings stream={localStream}>
                      <CameraOffAvatar
                        name={myName}
                        initials={myInitial}
                        imageUrl={myAvatarUrl}
                        sizeClass="h-14 w-14"
                      />
                    </TileSpeakingRings>
                  </div>
                ) : null}
                <TileNameBadge>You</TileNameBadge>
                <TileMediaStatus micOn={micEnabled} cameraOn={cameraEnabled} />
              </div>
              {sideParticipants.map((participant, idx) => (
                <RemoteParticipantTile
                  key={participant.peer.peerId}
                  participant={participant}
                  className={groupTileCount === 3 && idx < 2 ? "min-h-0 md:min-h-22" : undefined}
                />
              ))}
            </div>
          </div>
        )
      ) : null}

      {/* --- Direct rooms --- */}
      {!isGroupRoom ? (
        showSearchingState ? (
          directCallMatchSearchFailed ? (
            <NoPeerAvailableState
              detail={directCallMatchSearchError}
              onTryAgain={onRetryDirectCallMatchSearch}
            />
          ) : (
            <SearchingCandidateState />
          )
        ) : (
          <>
            {/* Direct 1:1 primary layout (hidden while 16:9 or activity uses the scroll region below). */}
            <div
              className={cn(
                "absolute inset-0 flex min-h-0 flex-col gap-2 overflow-hidden p-3 md:flex-row",
                shareStageImmersive && "max-md:p-0 max-md:gap-0",
              )}
              style={{ display: stageRatio === "1:1" && !stageActivity ? "flex" : "none" }}
            >
              {directScreenShareSidebar ? (
                participantVideosInSidebar ? (
                  <div className="relative order-1 min-h-0 min-w-0 flex-1 overflow-hidden rounded-2xl bg-black">
                    <VideoMirror
                      srcRef={remoteVideoRef}
                      mirrored={false}
                      className={cn(
                        "absolute inset-0 h-full w-full",
                        remoteVideoLive
                          ? mainStageShowsScreen
                            ? "bg-black object-contain"
                            : "object-cover"
                          : "opacity-0",
                      )}
                    />
                    {!remoteVideoLive && (
                      <div className="absolute inset-0 flex items-center justify-center border border-border/60 bg-linear-to-br from-primary/15 via-muted/45 to-accent/20">
                        <TileSpeakingRings stream={remoteMicOff ? null : remoteStream}>
                          <CameraOffAvatar
                            name={peerLabel}
                            initials={peerInitials}
                            imageUrl={peerAvatarUrl}
                            sizeClass="h-20 w-20 md:h-24 md:w-24"
                          />
                        </TileSpeakingRings>
                      </div>
                    )}
                  </div>
                ) : shareStageImmersive ? (
                  <div className="relative order-1 min-h-0 min-w-0 flex-1 overflow-hidden rounded-2xl bg-black max-md:rounded-none">
                    <VideoMirror
                      srcRef={remoteVideoRef}
                      mirrored={false}
                      className={cn(
                        "absolute inset-0 h-full w-full",
                        remoteVideoLive
                          ? mainStageShowsScreen
                            ? "bg-black object-contain"
                            : "object-cover"
                          : "opacity-0",
                      )}
                    />
                    {!remoteVideoLive && (
                      <div className="absolute inset-0 flex items-center justify-center border border-border/60 bg-linear-to-br from-primary/15 via-muted/45 to-accent/20">
                        <TileSpeakingRings stream={remoteMicOff ? null : remoteStream}>
                          <CameraOffAvatar
                            name={peerLabel}
                            initials={peerInitials}
                            imageUrl={peerAvatarUrl}
                            sizeClass="h-20 w-20 md:h-24 md:w-24"
                          />
                        </TileSpeakingRings>
                      </div>
                    )}
                    {onSelectScreenShare ? (
                      <ScreenShareFilmstrip
                        tiles={screenShareTiles}
                        focusedKey={focusedScreenShareKey}
                        onSelect={onSelectScreenShare}
                        className="absolute bottom-2 left-2 right-2 z-10"
                      />
                    ) : null}
                  </div>
                ) : (
                  <>
                    <div className="relative order-1 min-h-0 min-w-0 flex-1 overflow-hidden rounded-2xl bg-black">
                      <VideoMirror
                        srcRef={remoteVideoRef}
                        mirrored={false}
                        className={cn(
                          "absolute inset-0 h-full w-full",
                          remoteVideoLive
                            ? mainStageShowsScreen
                              ? "bg-black object-contain"
                              : "object-cover"
                            : "opacity-0",
                        )}
                      />
                      {!remoteVideoLive && (
                        <div className="absolute inset-0 flex items-center justify-center border border-border/60 bg-linear-to-br from-primary/15 via-muted/45 to-accent/20">
                          <TileSpeakingRings stream={remoteMicOff ? null : remoteStream}>
                            <CameraOffAvatar
                              name={peerLabel}
                              initials={peerInitials}
                              imageUrl={peerAvatarUrl}
                              sizeClass="h-20 w-20 md:h-24 md:w-24"
                            />
                          </TileSpeakingRings>
                        </div>
                      )}
                      {onSelectScreenShare ? (
                        <ScreenShareFilmstrip
                          tiles={screenShareTiles}
                          focusedKey={focusedScreenShareKey}
                          onSelect={onSelectScreenShare}
                          className="absolute bottom-2 left-2 right-2 z-10"
                        />
                      ) : null}
                    </div>

                    <div
                      className={cn(
                        "order-2 flex min-h-0 w-full shrink-0 gap-2 max-md:flex-col max-md:h-auto",
                        "md:h-auto md:w-40 md:flex-col md:gap-2 lg:w-44 md:max-h-full",
                      )}
                    >
                      <div
                        className={cn(
                          "relative flex min-h-0 min-w-0 overflow-hidden rounded-2xl border border-border/60 bg-card shadow-sm",
                          "max-md:aspect-video max-md:w-full max-md:flex-none",
                          "md:min-h-0 md:flex-1 md:max-h-[48%]",
                        )}
                      >
                        <video
                          ref={sidebarRemoteVideoRef}
                          playsInline
                          autoPlay
                          className={cn(
                            "absolute inset-0 h-full w-full object-cover",
                            !sidebarRemoteLive && "opacity-0",
                          )}
                        />
                        {!sidebarRemoteLive && (
                          <div className="absolute inset-0 flex items-center justify-center border border-border/60 bg-linear-to-br from-primary/15 via-muted/45 to-accent/20">
                            <TileSpeakingRings stream={remoteMicOff ? null : remoteStream}>
                              <CameraOffAvatar
                                name={peerLabel}
                                initials={peerInitials}
                                imageUrl={peerAvatarUrl}
                                sizeClass="h-14 w-14 md:h-16 md:w-16"
                              />
                            </TileSpeakingRings>
                          </div>
                        )}
                        <TileNameBadge className="border-white/10 bg-black/55 text-white/90">
                          {peerLabel}
                        </TileNameBadge>
                        <TileMediaStatus
                          micOn={remoteMicOff ? false : undefined}
                          cameraOn={remoteCameraOff ? false : undefined}
                        />
                      </div>
                      <div
                        className={cn(
                          "relative flex min-h-0 min-w-0 overflow-hidden rounded-2xl border border-border/60 bg-card shadow-sm",
                          "max-md:aspect-video max-md:w-full max-md:flex-none",
                          "md:min-h-0 md:flex-1 md:max-h-[48%]",
                        )}
                      >
                        <video
                          ref={sidebarLocalVideoRef}
                          playsInline
                          autoPlay
                          muted
                          className={cn(
                            "absolute inset-0 h-full w-full object-cover",
                            !sidebarLocalLive && "opacity-0",
                          )}
                          style={{ transform: "scaleX(-1)" }}
                        />
                        {!sidebarLocalLive && (
                          <div className="absolute inset-0 flex items-center justify-center border border-border/60 bg-linear-to-br from-primary/15 via-muted/45 to-accent/20">
                            <TileSpeakingRings stream={localStream}>
                              <CameraOffAvatar
                                name={myName}
                                initials={myInitial}
                                imageUrl={myAvatarUrl}
                                sizeClass="h-14 w-14 md:h-16 md:w-16"
                              />
                            </TileSpeakingRings>
                          </div>
                        )}
                        <TileNameBadge>You</TileNameBadge>
                        <TileMediaStatus micOn={micEnabled} cameraOn={cameraEnabled} />
                      </div>
                    </div>
                  </>
                )
              ) : (
                <>
                  <div className="relative min-h-0 w-full flex-1 basis-0 overflow-hidden rounded-2xl bg-black">
                    <VideoMirror
                      srcRef={remoteVideoRef}
                      mirrored={false}
                      className={cn(
                        "absolute inset-0 h-full w-full",
                        remoteVideoLive
                          ? mainStageShowsScreen
                            ? "bg-black object-contain"
                            : "object-cover"
                          : "opacity-0",
                      )}
                    />
                    {!remoteVideoLive && (
                      <div className="absolute inset-0 flex items-center justify-center border border-border/60 bg-linear-to-br from-primary/15 via-muted/45 to-accent/20">
                        <TileSpeakingRings stream={remoteMicOff ? null : remoteStream}>
                          <CameraOffAvatar
                            name={peerLabel}
                            initials={peerInitials}
                            imageUrl={peerAvatarUrl}
                            sizeClass="h-20 w-20 md:h-24 md:w-24"
                          />
                        </TileSpeakingRings>
                      </div>
                    )}
                    <TileNameBadge className="border-white/10 bg-black/55 text-white/90">
                      {peerLabel}
                    </TileNameBadge>
                    <TileMediaStatus
                      micOn={remoteMicOff ? false : undefined}
                      cameraOn={remoteCameraOff ? false : undefined}
                    />
                    {onSelectScreenShare && !participantVideosInSidebar ? (
                      <ScreenShareFilmstrip
                        tiles={screenShareTiles}
                        focusedKey={focusedScreenShareKey}
                        onSelect={onSelectScreenShare}
                        className="absolute bottom-2 left-2 right-2 z-10"
                      />
                    ) : null}
                  </div>

                  <div className="relative min-h-0 w-full flex-1 basis-0 overflow-hidden rounded-2xl border border-border/60 bg-card">
                    <VideoMirror
                      srcRef={localVideoRef}
                      mirrored
                      className={cn(
                        "absolute inset-0 h-full w-full object-cover",
                        !localVideoLive && "opacity-0",
                      )}
                    />
                    {!localVideoLive && (
                      <div className="absolute inset-0 flex items-center justify-center border border-border/60 bg-linear-to-br from-primary/15 via-muted/45 to-accent/20">
                        <TileSpeakingRings stream={localStream}>
                          <CameraOffAvatar
                            name={myName}
                            initials={myInitial}
                            imageUrl={myAvatarUrl}
                            sizeClass="h-20 w-20 md:h-24 md:w-24"
                          />
                        </TileSpeakingRings>
                      </div>
                    )}
                    <TileNameBadge>You</TileNameBadge>
                    <TileMediaStatus micOn={micEnabled} cameraOn={cameraEnabled} />
                  </div>
                </>
              )}
            </div>

            {/* Direct 16:9, chess, and other activities: single scroll surface. */}
            <div
              className="absolute inset-0 overflow-x-hidden overflow-y-auto overscroll-y-contain rounded-[1.2rem] md:overflow-hidden"
              style={{ display: stageRatio === "1:1" && !stageActivity ? "none" : "block" }}
            >
              {/*
                One scroll surface: padding lives inside the scroll flow so the toolbar
                clears the last pixels — avoid nesting h-full + overflow-y-auto (feels like a second scroller by the board).
              */}
              <div
                className={cn(
                  "relative w-full min-h-0",
                  /* Desktop: fill stage so `RoomActivityLayout`’s `md:absolute md:inset-0` has a real height. Mobile chess: height from content + one outer scroll. */
                  stageActivity ? "min-h-0 md:h-full" : "h-full min-h-0 pb-0",
                )}
              >
                {stageActivity ? (
                  activeActivityMeta ? (
                    <ActivityStage
                      activity={activeActivityMeta}
                      onExit={() =>
                        activeRealtimeActivity?.kind === "chess" ? onEndActiveGame?.() : setActiveActivity(null)
                      }
                      peerLabel={peerLabel}
                      myName={myName}
                      currentUserId={currentUserId ?? null}
                      peerInitials={peerInitials}
                      remoteVideoLive={remoteVideoLive}
                      localVideoLive={localVideoLive}
                      remoteStream={remoteStream}
                      localStream={localStream}
                      remoteMicOff={remoteMicOff}
                      remoteCameraOff={remoteCameraOff}
                      micEnabled={micEnabled}
                      cameraEnabled={cameraEnabled}
                      activeRealtimeActivity={activeRealtimeActivity}
                      onEndActiveGame={onEndActiveGame}
                      onOfferDrawGame={onOfferDrawGame}
                    />
                  ) : null
                ) : (
                  <div className="relative h-full min-h-0 w-full">
                    <VideoMirror
                      srcRef={remoteVideoRef}
                      className={cn(
                        "absolute inset-0 h-full w-full",
                        remoteVideoLive
                          ? mainStageShowsScreen
                            ? "bg-black object-contain"
                            : "object-cover"
                          : "opacity-0",
                      )}
                    />
                    {!remoteVideoLive && (
                      <div className="absolute inset-0 flex items-center justify-center border border-border/60 bg-linear-to-br from-primary/15 via-muted/45 to-accent/20">
                        <TileSpeakingRings stream={remoteMicOff ? null : remoteStream}>
                          <CameraOffAvatar
                            name={peerLabel}
                            initials={peerInitials}
                            imageUrl={peerAvatarUrl}
                            sizeClass="h-32 w-32 md:h-36 md:w-36"
                          />
                        </TileSpeakingRings>
                      </div>
                    )}
                    <TileMediaStatus
                      micOn={remoteMicOff ? false : undefined}
                      cameraOn={remoteCameraOff ? false : undefined}
                    />
                    {onSelectScreenShare && !participantVideosInSidebar ? (
                      <ScreenShareFilmstrip
                        tiles={screenShareTiles}
                        focusedKey={focusedScreenShareKey}
                        onSelect={onSelectScreenShare}
                        className="absolute bottom-3 left-3 right-3 z-10"
                      />
                    ) : null}
                  </div>
                )}
              </div>
            </div>
          </>
        )
      ) : null}
    </>
  );
}
