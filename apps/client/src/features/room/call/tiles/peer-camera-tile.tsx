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
  PeerProfileHoverSnippet,
  TileSpeakingRings,
} from "@/features/room/call/tiles/tile-primitives";
import { ParticipantTileControlsBar } from "@/features/room/call/tiles/parts/tile-participant-controls-bar";
import {
  CALL_TILE_AVATAR_SIZE_MAIN,
  CALL_TILE_CAMERA_OFF_CLASS,
  CALL_TILE_REMOTE_CLASS,
  CALL_TILE_REMOTE_NAME_BADGE_CLASS,
} from "@/features/room/call/tiles/tile-styles";
import type { OnRemoveSpaceParticipant } from "@/features/room/types/call/participant-remove.types";
import { LIVE_SPEAKER_TILE_RING } from "@/features/room/lib/call/active-speaker";

export function RemoteParticipantTile({
  participant,
  className,
  isLiveSpeaker = false,
  avatarSizeClass = CALL_TILE_AVATAR_SIZE_MAIN,
  canKick = false,
  kickingUserId = null,
  onKickParticipant,
}: {
  participant: RemoteParticipant;
  className?: string;
  /** From rtc-service `dominantSpeaker` (mic level + silence clears). */
  isLiveSpeaker?: boolean;
  avatarSizeClass?: string;
  canKick?: boolean;
  kickingUserId?: string | null;
  onKickParticipant?: OnRemoveSpaceParticipant;
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
        isLiveSpeaker && LIVE_SPEAKER_TILE_RING,
        className,
      )}
    >
      {live ? (
        <video
          ref={videoRef}
          playsInline
          autoPlay
          className="pointer-events-none absolute inset-0 h-full w-full object-cover"
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

      <PeerProfileHoverSnippet
        peerUserId={peer.peerId}
        fallbackDisplayName={label}
        fallbackImageUrl={peer.image}
        badgeClassName={CALL_TILE_REMOTE_NAME_BADGE_CLASS}
      >
        {label}
      </PeerProfileHoverSnippet>

      <ParticipantTileControlsBar
        micOn={micOff ? false : undefined}
        cameraOn={cameraOff ? false : undefined}
        userId={peer.peerId}
        displayName={label}
        canKick={canKick}
        kickingUserId={kickingUserId}
        onKickParticipant={onKickParticipant}
      />
    </div>
  );
}
