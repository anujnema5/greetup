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
 * `participantVideosInSidebar` is owned by `RoomVideoView` (lg+ docked People tab). When true,
 * camera UI moves off-stage so the main area is only the shared screen.
 */
import { useRef, type RefObject } from "react";
import { cn } from "@/lib/utils";
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

type StageRatio = "16:9" | "1:1";

/** Grid columns for circle room: tile count = you + each `RemoteParticipant`. */
function circleGalleryGridClass(groupTileCount: number): string {
  if (groupTileCount === 1) return "grid-cols-1";
  if (groupTileCount === 2) return "grid-cols-1 sm:grid-cols-2";
  if (groupTileCount === 3) return "grid-cols-1 md:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]";
  if (groupTileCount <= 4) return "grid-cols-1 sm:grid-cols-2";
  if (groupTileCount <= 6) return "grid-cols-2 lg:grid-cols-3";
  if (groupTileCount <= 9) return "grid-cols-2 md:grid-cols-3 lg:grid-cols-4";
  return "grid-cols-2 md:grid-cols-4 lg:grid-cols-5";
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
  /** lg+ docked sidebar: cameras live in People panel; stage is screen-only. */
  participantVideosInSidebar = false,
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
      {/* --- Off-screen elements: mediasoup attaches streams here; visible layers use VideoMirror or extra refs --- */}
      <video
        ref={remoteVideoRef}
        playsInline
        autoPlay
        className="pointer-events-none absolute h-px w-px opacity-0"
        aria-hidden
      />
      <video
        ref={localVideoRef}
        playsInline
        autoPlay
        muted
        className="pointer-events-none absolute h-px w-px opacity-0"
        style={{ transform: "scaleX(-1)" }}
        aria-hidden
      />

      {/* --- Circle rooms --- */}
      {isGroupRoom ? (
        screenShareMainLayout ? (
          /* Circle + share: full-bleed stage on lg when cameras are in the People panel. */
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
            /* Circle + share (compact / undocked): share strip + participant grid below. */
            <div className="absolute inset-0 flex min-h-0 flex-col gap-1.5 p-1 md:p-1.5">
              <div className="relative min-h-[36%] flex-1 overflow-hidden rounded-xl border border-border/50 bg-black shadow-sm">
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
              <div className="min-h-0 flex-1 overflow-y-auto">
                <div className={cn("grid min-h-0 auto-rows-fr gap-1 md:gap-1", groupGridClass)}>
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
            </div>
          )
        ) : (
          /* Circle, cameras only (no main screen-share layout). */
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
              className="absolute inset-0 flex min-h-0 flex-col gap-2 overflow-hidden p-3 md:flex-row"
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
                        "order-2 flex min-h-0 w-full shrink-0 gap-2 md:w-40 md:flex-col md:gap-2 lg:w-44",
                        "h-32 md:h-auto md:max-h-full",
                      )}
                    >
                      <div className="relative flex min-h-0 min-w-0 flex-1 overflow-hidden rounded-2xl border border-border/60 bg-card shadow-sm md:aspect-video md:max-h-[42%] md:flex-none lg:max-h-[45%]">
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
                      <div className="relative flex min-h-0 min-w-0 flex-1 overflow-hidden rounded-2xl border border-border/60 bg-card shadow-sm md:aspect-video md:max-h-[42%] md:flex-none lg:max-h-[45%]">
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
