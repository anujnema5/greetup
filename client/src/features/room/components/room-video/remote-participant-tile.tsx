"use client";

import { useMemo, useRef } from "react";
import { hasLiveVideo, type RemoteParticipant } from "@/features/rtc";
import { MOCK_MATCH } from "@/features/room/constants/mock-match";
import { useAttachMediaStream } from "@/features/room/hooks/use-attach-media-stream";

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
    <div
      className="relative flex min-h-[5.5rem] min-w-0 flex-col overflow-hidden rounded-xl"
      style={{
        border: "2px solid rgba(255,255,255,0.12)",
        boxShadow: "0 8px 24px rgba(0,0,0,0.3)",
        aspectRatio: "16 / 10",
      }}
    >
      {live ? (
        <video ref={videoRef} playsInline autoPlay className="h-full w-full object-cover" />
      ) : (
        <div
          className="flex h-full w-full flex-1 items-center justify-center"
          style={{
            background: "linear-gradient(135deg, oklch(30% 0.04 105), oklch(20% 0.02 110))",
          }}
        >
          <div
            className="flex h-14 w-14 items-center justify-center rounded-full text-lg font-bold text-white"
            style={{
              background: `linear-gradient(135deg, ${MOCK_MATCH.gradFrom}, ${MOCK_MATCH.gradTo})`,
            }}
          >
            {initials || "?"}
          </div>
        </div>
      )}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-linear-to-t from-black/85 via-black/40 to-transparent px-2 py-1.5 pt-8">
        <p className="truncate text-[10px] font-medium text-white drop-shadow-sm">{label}</p>
      </div>
    </div>
  );
}
