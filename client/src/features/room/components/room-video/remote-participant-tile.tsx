"use client";

import { useMemo, useRef } from "react";
import Image from "next/image";
import { hasLiveVideo, type RemoteParticipant } from "@/features/rtc";
import { useAttachMediaStream } from "@/features/room/hooks/use-attach-media-stream";
import { getProfileImageUrl } from "@/lib/ui/profile-image";

export function RemoteParticipantTile({ participant }: { participant: RemoteParticipant }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const { peer, stream } = participant;
  const cameraOff = peer.cameraActive === false;
  const live = hasLiveVideo(stream) && !cameraOff;

  const label = peer.displayName?.trim() || `Peer ${peer.peerId.slice(0, 8)}…`;
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

  useAttachMediaStream(videoRef, stream, live);

  return (
    <div className="relative flex min-h-22 min-w-0 flex-col overflow-hidden rounded-xl border border-border/50 shadow-sm aspect-16/10">
      {live ? (
        <video ref={videoRef} playsInline autoPlay className="h-full w-full object-cover" />
      ) : (
        <div className="flex h-full w-full flex-1 items-center justify-center bg-muted/20">
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
        </div>
      )}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-linear-to-t from-black/85 via-black/40 to-transparent px-2 py-1.5 pt-8">
        <p className="truncate text-[10px] font-medium text-white drop-shadow-sm">{label}</p>
      </div>
    </div>
  );
}
