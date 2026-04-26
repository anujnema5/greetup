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
  SearchingCandidateState,
  TileNameBadge,
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
}: {
  isGroupRoom: boolean;
  groupGalleryParticipants: RemoteParticipant[];
  remoteVideoRef: RefObject<HTMLVideoElement | null>;
  localVideoRef: RefObject<HTMLVideoElement | null>;
  showSearchingState: boolean;
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
}) {
  const stageActivity = activeRealtimeActivity?.kind === "chess" ? "chess" : activeActivity;

  if (isGroupRoom) {
    return groupGalleryParticipants.length > 0 ? (
      <div className="absolute inset-0 overflow-y-auto p-2 md:p-3">
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3 sm:gap-3">
          {groupGalleryParticipants.map((participant) => (
            <RemoteParticipantTile key={participant.peer.peerId} participant={participant} />
          ))}
        </div>
      </div>
    ) : (
      <div className="absolute inset-0 flex items-center justify-center px-4 text-center text-sm font-medium text-white/50">
        Waiting for others to join…
      </div>
    );
  }

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

      {showSearchingState ? (
        <SearchingCandidateState />
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
                  <CameraOffAvatar
                    name={peerLabel}
                    initials={peerInitials}
                    imageUrl={peerAvatarUrl}
                    sizeClass="h-20 w-20 md:h-24 md:w-24"
                  />
                </div>
              )}
              <TileNameBadge className="border-white/10 bg-black/55 text-white/90">
                {peerLabel}
              </TileNameBadge>
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
                  <CameraOffAvatar
                    name={myName}
                    initials={myInitial}
                    imageUrl={myAvatarUrl}
                    sizeClass="h-20 w-20 md:h-24 md:w-24"
                  />
                </div>
              )}
              <TileNameBadge>You</TileNameBadge>
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
                      <CameraOffAvatar
                        name={peerLabel}
                        initials={peerInitials}
                        imageUrl={peerAvatarUrl}
                        sizeClass="h-32 w-32 md:h-36 md:w-36"
                      />
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </>
  );
}
