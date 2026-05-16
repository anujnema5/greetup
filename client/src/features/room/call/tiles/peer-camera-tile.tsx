"use client";

import { useRef } from "react";
import {
  hasRenderableRemoteVideo,
  mediaStreamVideoAttachRevision,
  type RemoteParticipant,
} from "@/features/rtc";
import {
  useAttachMediaStream,
  useRerenderOnVideoTrackMuteCycle,
} from "@/features/room/hooks/media/use-attach-media-stream";
import { cn } from "@/lib/utils";
import {
  CameraOffAvatar,
  TileNameBadge,
  TileMediaStatus,
  TileSpeakingRings,
} from "@/features/room/call/tiles/tile-primitives";
import {
  CALL_TILE_AVATAR_SIZE_MAIN,
  CALL_TILE_CAMERA_OFF_CLASS,
  CALL_TILE_REMOTE_CLASS,
  CALL_TILE_REMOTE_NAME_BADGE_CLASS,
} from "@/features/room/call/tiles/tile-styles";
import { LIVE_SPEAKER_TILE_RING } from "@/features/room/lib/call/active-speaker";

export function RemoteParticipantTile({
  participant,
  className,
  isDominantSpeaker = false,
  avatarSizeClass = CALL_TILE_AVATAR_SIZE_MAIN,
}: {
  participant: RemoteParticipant;
  className?: string;
  /** From rtc-service `dominantSpeaker` (mic level + silence clears). */
  isDominantSpeaker?: boolean;
  avatarSizeClass?: string;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const { peer, stream } = participant;

  const cameraOff = peer.cameraActive === false;
  const micOff = peer.micActive === false;
  const muteCycle = useRerenderOnVideoTrackMuteCycle(stream);
  const live = hasRenderableRemoteVideo(stream) && !cameraOff;
  const attachStream = live ? stream : null;
  const attachKey = `${muteCycle}:${mediaStreamVideoAttachRevision(stream)}`;

  const label = peer.displayName?.trim() || `Peer ${peer.peerId.slice(0, 6)}`;
  const initials =
    label
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((w) => w[0]!.toUpperCase())
      .join("") || "?";

  useAttachMediaStream(videoRef, attachStream, attachKey);

  return (
    <div
      className={cn(
        CALL_TILE_REMOTE_CLASS,
        isDominantSpeaker && LIVE_SPEAKER_TILE_RING,
        className,
      )}
    >
      {live ? (
        <video
          ref={videoRef}
          playsInline
          autoPlay
          className="absolute inset-0 h-full w-full object-cover"
        />
      ) : (
        <div className={CALL_TILE_CAMERA_OFF_CLASS}>
          <TileSpeakingRings stream={micOff ? null : stream}>
            <CameraOffAvatar
              name={label}
              initials={initials}
              imageUrl={peer.image}
              sizeClass={avatarSizeClass}
            />
          </TileSpeakingRings>
        </div>
      )}

      <TileNameBadge className={CALL_TILE_REMOTE_NAME_BADGE_CLASS}>{label}</TileNameBadge>

      <TileMediaStatus
        micOn={micOff ? false : undefined}
        cameraOn={cameraOff ? false : undefined}
      />
    </div>
  );
}
