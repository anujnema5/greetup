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
 * `participantVideosInSidebar` is owned by `InCallScreen`: when true, cameras live only in the
 * People panel and the stage is screen-only (typically desktop during share). Below `md`, it is
 * false during share so participants stay on the main stage (stacked / grid — see compact layouts).
 */
import { useRef, type RefObject } from "react";
import { cn } from "@/lib/utils";
import { circleGridClass } from "@/features/room/call/layouts/grid/circle-grid-classes";
import { CircleGalleryGrid } from "@/features/room/call/layouts/grid/circle-grid";
import type { RoomActivityId } from "@/features/room/types/call/room-activity.types";
import type { RoomActivityMeta } from "@/features/room/types/call/room-activity.types";
import { ActivityStage } from "@/features/room/call/activities/activity-stage";
import type { RoomActiveActivity } from "@/lib/redux/types/room-slice.types";
import { CALL_TILE_AVATAR_SIZE_COMPACT } from "@/features/room/call/tiles/tile-styles";
import { LocalParticipantTile } from "@/features/room/call/tiles/my-camera-tile";
import { RemoteParticipantTile } from "@/features/room/call/tiles/peer-camera-tile";
import {
  CameraOffAvatar,
  NoPeerAvailableState,
  SearchingCandidateState,
  TileMediaStatus,
  TileNameBadge,
  TileSpeakingRings,
  VideoMirror,
} from "@/features/room/call/tiles/tile-primitives";
import type { RemoteParticipant, ScreenShareTileInfo } from "@/features/rtc";
import { hasLiveEnabledVideo, hasLiveVideo } from "@/features/rtc";
import { useAttachMediaStream } from "@/features/room/hooks/media/use-attach-media-stream";
import { ScreenShareFilmstrip } from "@/features/room/call/layouts/screen-share/screen-share-strip";
import { CamerasUnderScreenShare } from "@/features/room/call/layouts/screen-share/cameras-under-screen";
import {
  DOMINANT_SPEAKER_TILE_RING,
  isDirectCallRemoteSideDominant,
  isDominantSpeakerLocalUser,
  isDominantSpeakerPeer,
} from "@/features/room/lib/call/active-speaker";

type StageRatio = "16:9" | "1:1";

export function MainStage({
  isGroupRoom,
  groupGalleryParticipants,
  remoteVideoRef,
  localVideoRef,
  showSearchingState,
  directSoloLayout,
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
  dominantSpeakerPeerId = null,
  dominantSpeakerSpeakingMs = {},
}: {
  isGroupRoom: boolean;
  groupGalleryParticipants: RemoteParticipant[];
  remoteVideoRef: RefObject<HTMLVideoElement | null>;
  localVideoRef: RefObject<HTMLVideoElement | null>;
  showSearchingState: boolean;
  /** True when the direct call stage should show only the local tile (no empty “remote” slot). */
  directSoloLayout: boolean;
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
  /** SFU mic-dominant user id (rtc-service `dominantSpeaker`). */
  dominantSpeakerPeerId?: string | null;
  dominantSpeakerSpeakingMs?: Record<string, number>;
}) {
  const stageActivity = activeRealtimeActivity?.kind === "chess" ? "chess" : activeActivity;

  const localDominant = isDominantSpeakerLocalUser(dominantSpeakerPeerId, currentUserId ?? null);
  const directRemoteDominant = isDirectCallRemoteSideDominant(
    isGroupRoom,
    dominantSpeakerPeerId,
    currentUserId ?? null,
  );

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

  const sidebarAttachKey = `${sidebarRemoteLive}-${shareStageImmersive}`;
  const localSidebarAttachKey = `${sidebarLocalLive}-${shareStageImmersive}`;
  const directScreenShareFilmstripSelect = participantVideosInSidebar
    ? undefined
    : onSelectScreenShare;
  useAttachMediaStream(sidebarRemoteVideoRef, sidebarRemoteStream, sidebarAttachKey);
  useAttachMediaStream(
    sidebarLocalVideoRef,
    directScreenShareSidebar ? localStream : null,
    localSidebarAttachKey,
  );

  const groupTileCount = groupGalleryParticipants.length + 1;
  const featuredParticipant =
    screenShareMainLayout || groupTileCount !== 3 ? null : (groupGalleryParticipants[0] ?? null);
  const sideParticipants =
    featuredParticipant == null
      ? groupGalleryParticipants
      : groupGalleryParticipants.filter((p) => p.peer.peerId !== featuredParticipant.peer.peerId);
  const groupGridClass = circleGridClass(groupTileCount);
  const circleTileAvatarSize =
    groupTileCount <= 2 ? undefined : CALL_TILE_AVATAR_SIZE_COMPACT;
  /** Same full-area local tile as 1:1 “You”, without a side-by-side empty peer slot. */
  const renderDirectSoloCamera = directSoloLayout && !stageActivity;

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
        className="pointer-events-none fixed top-0 left-[-9999px] z-[-1] h-[180px] w-[320px] opacity-0 -scale-x-100"
        aria-hidden
      />

      {/* --- Circle rooms --- */}
      {isGroupRoom ? (
        screenShareMainLayout ? (
          /* Circle + share: shared screen on top, 2×2 participant grid below. Grid hides on xl+ (cameras in People panel). */
          <div
            className={cn(
              "absolute inset-0 flex min-h-0 flex-col gap-1.5 p-1 md:p-1.5 xl:gap-0 xl:p-0",
              shareStageImmersive && "gap-0 p-0",
            )}
          >
            <div
              className={cn(
                "relative min-h-0 overflow-hidden rounded-xl border border-border/50 bg-black shadow-sm",
                shareStageImmersive
                  ? "flex-1 rounded-none border-0 shadow-none"
                  : "flex-[1.12] xl:flex-1 xl:rounded-none xl:border-0 xl:shadow-none",
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
                  className="absolute bottom-2 left-2 right-2 z-10 max-h-[40%] xl:hidden"
                />
              ) : null}
            </div>
            {!shareStageImmersive ? (
              <CamerasUnderScreenShare
                localVideoRef={localVideoRef}
                localVideoLive={localVideoLive}
                localStream={localStream}
                myName={myName}
                myInitial={myInitial}
                myAvatarUrl={myAvatarUrl}
                micEnabled={micEnabled ?? true}
                cameraEnabled={cameraEnabled ?? true}
                remoteParticipants={sideParticipants}
                className="min-h-0 md:flex-1 md:min-h-0 xl:hidden"
                currentUserId={currentUserId ?? null}
                dominantSpeakerPeerId={dominantSpeakerPeerId}
                dominantSpeakerSpeakingMs={dominantSpeakerSpeakingMs}
              />
            ) : null}
          </div>
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
            currentUserId={currentUserId ?? null}
            dominantSpeakerPeerId={dominantSpeakerPeerId}
          />
        ) : (
          /* 1–6 participants: adaptive single-page grid (featured layout for 3, 2×2 for 4, etc.) */
          <div className="absolute inset-0 overflow-y-auto p-1 md:p-1.5">
            <div className={cn("grid h-full min-h-0 auto-rows-fr gap-1 md:gap-1", groupGridClass)}>
              {featuredParticipant ? (
                <RemoteParticipantTile
                  participant={featuredParticipant}
                  className="md:row-span-2"
                  avatarSizeClass={circleTileAvatarSize}
                  isDominantSpeaker={isDominantSpeakerPeer(
                    dominantSpeakerPeerId,
                    featuredParticipant.peer.peerId,
                  )}
                />
              ) : null}
              <LocalParticipantTile
                localVideoRef={localVideoRef}
                localVideoLive={localVideoLive}
                localStream={localStream}
                myName={myName}
                myInitial={myInitial}
                myAvatarUrl={myAvatarUrl}
                micEnabled={micEnabled}
                cameraEnabled={cameraEnabled}
                isDominantSpeaker={localDominant}
                avatarSizeClass={circleTileAvatarSize}
              />
              {sideParticipants.map((participant, idx) => (
                <RemoteParticipantTile
                  key={participant.peer.peerId}
                  participant={participant}
                  className={groupTileCount === 3 && idx < 2 ? "min-h-0 md:min-h-22" : undefined}
                  avatarSizeClass={circleTileAvatarSize}
                  isDominantSpeaker={isDominantSpeakerPeer(
                    dominantSpeakerPeerId,
                    participant.peer.peerId,
                  )}
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
        ) : renderDirectSoloCamera ? (
          <div
            className={cn(
              "absolute inset-0 min-h-0 flex flex-col gap-2 overflow-hidden p-3",
              shareStageImmersive && "max-md:p-0 max-md:gap-0",
            )}
          >
            <div
              className={cn(
                "relative min-h-0 min-w-0 flex-1 overflow-hidden rounded-2xl border border-border/60 bg-card",
                localDominant && DOMINANT_SPEAKER_TILE_RING,
              )}
            >
              <VideoMirror
                srcRef={localVideoRef}
                mirrored
                className={cn(
                  "absolute inset-0 h-full w-full object-cover",
                  !localVideoLive && "opacity-0",
                )}
              />
              {!localVideoLive ? (
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
              ) : null}
              <TileNameBadge>You</TileNameBadge>
              <TileMediaStatus micOn={micEnabled} cameraOn={cameraEnabled} />
            </div>
          </div>
        ) : (
          <>
            {/* Direct 1:1 primary layout (hidden while 16:9 or activity uses the scroll region below). */}
            <div
              className={cn(
                "absolute inset-0 min-h-0 flex-col gap-2 overflow-hidden p-3",
                directScreenShareSidebar ? "flex" : "flex max-md:flex-col md:flex-row",
                shareStageImmersive && "max-md:p-0 max-md:gap-0",
                stageRatio === "1:1" && !stageActivity ? "flex" : "hidden",
              )}
            >
              {directScreenShareSidebar ? (
                shareStageImmersive ? (
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
                        className="absolute bottom-2 left-2 right-2 z-10 xl:hidden"
                      />
                    ) : null}
                  </div>
                ) : (
                  <>
                    <div
                      className={cn(
                        "relative order-1 min-h-0 min-w-0 overflow-hidden rounded-2xl bg-black",
                        /* Phone: share grows; tablet / iPad portrait (up to `xl`): ~upper 40% stage, cameras below full width. */
                        "flex-1 max-md:min-h-0",
                        "md:max-xl:flex-none md:max-xl:basis-[42%] md:max-xl:shrink-0",
                        "xl:flex-1 xl:min-h-0 xl:rounded-none xl:border-0 xl:shadow-none",
                      )}
                    >
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
                          className="absolute bottom-2 left-2 right-2 z-10 xl:hidden"
                        />
                      ) : null}
                    </div>

                    <div
                      className={cn(
                        "order-2 flex min-h-0 w-full gap-2 max-md:flex-col max-md:h-auto max-md:shrink-0",
                        /* Under shared screen: remaining stage height; at `xl+` use docked People panel instead of this row. */
                        "md:flex-row md:items-stretch md:max-xl:flex-1 md:max-xl:min-h-0",
                        "xl:h-auto xl:w-40 xl:shrink-0 xl:flex-col xl:gap-2 xl:max-h-full",
                        "xl:hidden",
                      )}
                    >
                      <div
                        className={cn(
                          "relative flex min-h-0 min-w-0 overflow-hidden rounded-2xl border border-border/60 bg-card shadow-sm",
                          "max-md:aspect-video max-md:w-full max-md:flex-none",
                          "md:max-xl:flex-1 md:max-xl:min-h-0 md:max-xl:self-stretch",
                          "xl:min-h-0 xl:flex-1 xl:max-h-[48%]",
                          directRemoteDominant && DOMINANT_SPEAKER_TILE_RING,
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
                          "md:max-xl:flex-1 md:max-xl:min-h-0 md:max-xl:self-stretch",
                          "xl:min-h-0 xl:flex-1 xl:max-h-[48%]",
                          localDominant && DOMINANT_SPEAKER_TILE_RING,
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
                            "-scale-x-100",
                          )}
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
                  <div
                    className={cn(
                      "relative min-h-0 min-w-0 flex-1 basis-0 overflow-hidden rounded-2xl bg-black",
                      directRemoteDominant && DOMINANT_SPEAKER_TILE_RING,
                    )}
                  >
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
                    {directScreenShareFilmstripSelect ? (
                      <ScreenShareFilmstrip
                        tiles={screenShareTiles}
                        focusedKey={focusedScreenShareKey}
                        onSelect={directScreenShareFilmstripSelect}
                        className="absolute bottom-2 left-2 right-2 z-10 xl:hidden"
                      />
                    ) : null}
                  </div>

                  <div
                    className={cn(
                      "relative min-h-0 min-w-0 flex-1 basis-0 overflow-hidden rounded-2xl border border-border/60 bg-card",
                      localDominant && DOMINANT_SPEAKER_TILE_RING,
                    )}
                  >
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
              className={cn(
                "absolute inset-0 overflow-x-hidden overflow-y-auto overscroll-y-contain rounded-[1.2rem] md:overflow-hidden",
                stageRatio === "1:1" && !stageActivity && "hidden",
              )}
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
                      peerAvatarUrl={peerAvatarUrl}
                      myAvatarUrl={myAvatarUrl}
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
                    {directScreenShareFilmstripSelect ? (
                      <ScreenShareFilmstrip
                        tiles={screenShareTiles}
                        focusedKey={focusedScreenShareKey}
                        onSelect={directScreenShareFilmstripSelect}
                        className="absolute bottom-3 left-3 right-3 z-10 xl:hidden"
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
