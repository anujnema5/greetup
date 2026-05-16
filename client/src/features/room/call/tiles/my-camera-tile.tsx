"use client";

import type { RefObject } from "react";
import { cn } from "@/lib/utils";
import {
  CameraOffAvatar,
  TileMediaStatus,
  TileNameBadge,
  TileSpeakingRings,
  VideoMirror,
} from "@/features/room/call/tiles/tile-primitives";
import {
  CALL_TILE_AVATAR_SIZE_MAIN,
  CALL_TILE_CAMERA_OFF_CLASS,
  CALL_TILE_LOCAL_CLASS,
} from "@/features/room/call/tiles/tile-styles";
import { LIVE_SPEAKER_TILE_RING } from "@/features/room/lib/call/active-speaker";

export function LocalParticipantTile({
  localVideoRef,
  localVideoLive,
  localStream,
  myName,
  myInitial,
  myAvatarUrl,
  micEnabled,
  cameraEnabled,
  className,
  isLiveSpeaker = false,
  avatarSizeClass = CALL_TILE_AVATAR_SIZE_MAIN,
}: {
  localVideoRef: RefObject<HTMLVideoElement | null>;
  localVideoLive: boolean;
  localStream: MediaStream | null;
  myName: string;
  myInitial: string;
  myAvatarUrl?: string | null;
  micEnabled?: boolean;
  cameraEnabled?: boolean;
  className?: string;
  isLiveSpeaker?: boolean;
  avatarSizeClass?: string;
}) {
  return (
    <div
      className={cn(
        CALL_TILE_LOCAL_CLASS,
        isLiveSpeaker && LIVE_SPEAKER_TILE_RING,
        className,
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
        <div className={CALL_TILE_CAMERA_OFF_CLASS}>
          <TileSpeakingRings stream={localStream}>
            <CameraOffAvatar
              name={myName}
              initials={myInitial}
              imageUrl={myAvatarUrl}
              sizeClass={avatarSizeClass}
            />
          </TileSpeakingRings>
        </div>
      ) : null}
      <TileNameBadge>You</TileNameBadge>
      <TileMediaStatus micOn={micEnabled} cameraOn={cameraEnabled} />
    </div>
  );
}
