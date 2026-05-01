"use client";

import type { RefObject } from "react";
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
import type { RemoteParticipant } from "@/features/rtc";

type StageRatio = "16:9" | "1:1";

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
}) {
  const stageActivity = activeRealtimeActivity?.kind === "chess" ? "chess" : activeActivity;
  const groupTileCount = groupGalleryParticipants.length + 1;
  const featuredParticipant = groupTileCount === 3 ? groupGalleryParticipants[0] ?? null : null;
  const sideParticipants =
    featuredParticipant == null
      ? groupGalleryParticipants
      : groupGalleryParticipants.filter((p) => p.peer.peerId !== featuredParticipant.peer.peerId);
  const groupGridClass =
    groupTileCount === 1
      ? "grid-cols-1"
      : groupTileCount === 2
        ? "grid-cols-1 sm:grid-cols-2"
        : groupTileCount === 3
          ? "grid-cols-1 md:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]"
          : groupTileCount <= 4
            ? "grid-cols-1 sm:grid-cols-2"
            : groupTileCount <= 6
              ? "grid-cols-2 lg:grid-cols-3"
              : groupTileCount <= 9
                ? "grid-cols-2 md:grid-cols-3 lg:grid-cols-4"
                : "grid-cols-2 md:grid-cols-4 lg:grid-cols-5";

  return (
    <>
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
      {isGroupRoom ? (
        <div className="absolute inset-0 overflow-y-auto p-1 md:p-1.5">
          <div className={cn("grid h-full min-h-0 auto-rows-fr gap-1 md:gap-1", groupGridClass)}>
            {featuredParticipant ? (
              <RemoteParticipantTile participant={featuredParticipant} className="md:row-span-2" />
            ) : null}
            <div className="relative flex min-h-22 min-w-0 flex-col overflow-hidden rounded-xl border border-border/50 shadow-sm">
              <VideoMirror
                srcRef={localVideoRef}
                mirrored
                className={cn("absolute inset-0 h-full w-full object-cover", !localVideoLive && "opacity-0")}
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
      ) : null}

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
            <div
              className="absolute inset-0 flex min-h-0 flex-col gap-2 overflow-hidden p-3 md:flex-row"
              style={{ display: stageRatio === "1:1" && !stageActivity ? "flex" : "none" }}
            >
              <div className="relative min-h-0 w-full flex-1 basis-0 overflow-hidden rounded-2xl bg-black">
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
            </div>

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
