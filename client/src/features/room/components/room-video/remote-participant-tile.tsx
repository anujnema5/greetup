"use client";

import { useMemo, useRef } from "react";
import Image from "next/image";
import {
  hasRenderableRemoteVideo,
  mediaStreamVideoAttachRevision,
  type RemoteParticipant,
} from "@/features/rtc";
import {
  useAttachMediaStream,
  useRerenderOnVideoTrackMuteCycle,
} from "@/features/room/hooks/use-attach-media-stream";
import { getProfileImageUrl } from "@/lib/ui/profile-image";
import { cn } from "@/lib/utils";
import {
  TileNameBadge,
  TileMediaStatus,
  TileSpeakingRings,
} from "@/features/room/components/room-video/room-video-primitives";
import { DOMINANT_SPEAKER_TILE_RING } from "@/features/room/lib/dominant-speaker-tile";

export function RemoteParticipantTile({
  participant,
  className,
  isDominantSpeaker = false,
}: {
  participant: RemoteParticipant;
  className?: string;
  /** From rtc-service `dominantSpeaker` (mic level + silence clears). */
  isDominantSpeaker?: boolean;
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
  const initials = useMemo(
    () =>
      label
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map((w) => w[0]!.toUpperCase())
        .join(""),
    [label],
  );

  useAttachMediaStream(videoRef, attachStream, attachKey);

  return (
    <div
      className={cn(
        "relative flex min-h-22 min-w-0 flex-col overflow-hidden rounded-xl border border-border/50 shadow-sm",
        isDominantSpeaker && DOMINANT_SPEAKER_TILE_RING,
        className,
      )}
    >
      {live ? (
        <video ref={videoRef} playsInline autoPlay className="h-full w-full object-cover" />
      ) : (
        <div className="flex h-full w-full flex-1 items-center justify-center bg-muted/20">
          <TileSpeakingRings stream={micOff ? null : stream}>
            <div className="relative h-14 w-14 overflow-hidden rounded-full border border-border bg-muted text-foreground shadow-sm">
              {peer.image?.trim() ? (
                <Image
                  src={getProfileImageUrl(peer.image)}
                  alt={`${label} profile`}
                  fill
                  sizes="56px"
                  className="object-cover"
                  unoptimized
                />
              ) : (
                <span className="flex h-full w-full items-center justify-center text-lg font-bold">
                  {initials || "?"}
                </span>
              )}
            </div>
          </TileSpeakingRings>
        </div>
      )}

      <TileNameBadge className="max-w-[calc(100%-4rem)] truncate border-white/10 bg-black/55 text-white/90">
        {label}
      </TileNameBadge>

      {/* Mic / camera status — only renders when something is off */}
      <TileMediaStatus
        micOn={micOff ? false : undefined}
        cameraOn={cameraOff ? false : undefined}
      />
    </div>
  );
}
