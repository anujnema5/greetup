"use client";

/**
 * Camera tiles under the main screen-share region (circle calls, narrow viewport).
 *
 * Layouts:
 * - **3 people** — top row: two remotes; bottom: your camera full width.
 * - **4+ people** — 2×2 pages with prev/next (4 tiles per page, local included in order).
 */
import { useCallback, useState, type RefObject } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import type { RemoteParticipant } from "@/features/rtc";
import { RemoteParticipantTile } from "@/features/room/components/room-video/remote-participant-tile";
import {
  CameraOffAvatar,
  TileMediaStatus,
  TileNameBadge,
  TileSpeakingRings,
  VideoMirror,
} from "@/features/room/components/room-video/room-video-primitives";

const TILES_PER_PAGE = 4;
const SHELL_CLASS = "flex min-h-0 min-w-0 flex-1 flex-col gap-1";

export type ScreenShareMobileParticipantGridProps = {
  localVideoRef: RefObject<HTMLVideoElement | null>;
  localVideoLive: boolean;
  localStream: MediaStream | null;
  myName: string;
  myInitial: string;
  myAvatarUrl?: string | null;
  micEnabled: boolean;
  cameraEnabled: boolean;
  remoteParticipants: RemoteParticipant[];
  className?: string;
};

type LocalPreviewProps = Omit<
  ScreenShareMobileParticipantGridProps,
  "remoteParticipants" | "className"
>;

function LocalCameraPreview({
  localVideoRef,
  localVideoLive,
  localStream,
  myName,
  myInitial,
  myAvatarUrl,
  micEnabled,
  cameraEnabled,
  className,
}: LocalPreviewProps & { className?: string }) {
  return (
    <div
      className={cn(
        "relative flex min-h-0 min-w-0 overflow-hidden rounded-xl border border-border/50 shadow-sm",
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
        <div className="flex h-full w-full flex-1 items-center justify-center bg-muted/20">
          <TileSpeakingRings stream={localStream}>
            <CameraOffAvatar
              name={myName}
              initials={myInitial}
              imageUrl={myAvatarUrl}
              sizeClass="h-10 w-10"
            />
          </TileSpeakingRings>
        </div>
      ) : null}
      <TileNameBadge>You</TileNameBadge>
      <TileMediaStatus micOn={micEnabled} cameraOn={cameraEnabled} />
    </div>
  );
}

function localPreviewProps(p: ScreenShareMobileParticipantGridProps): LocalPreviewProps {
  const { remoteParticipants: _r, className: _c, ...rest } = p;
  return rest;
}

/** You + exactly two remotes: [peer][peer] / [You full width]. */
function ThreeParticipantShareGrid(props: ScreenShareMobileParticipantGridProps) {
  const { className, remoteParticipants } = props;
  const [leftRemote, rightRemote] = remoteParticipants;

  return (
    <div className={cn(SHELL_CLASS, className)}>
      <div className="grid min-h-0 min-w-0 flex-1 grid-cols-2 grid-rows-[minmax(0,1fr)_minmax(0,1.12fr)] gap-1">
        <RemoteParticipantTile participant={leftRemote} className="min-h-0 min-w-0" />
        <RemoteParticipantTile participant={rightRemote} className="min-h-0 min-w-0" />
        <LocalCameraPreview
          {...localPreviewProps(props)}
          className="col-span-2 min-h-0"
        />
      </div>
    </div>
  );
}

function PaginatedFourUpGrid(props: ScreenShareMobileParticipantGridProps) {
  const { className, remoteParticipants } = props;
  const total = remoteParticipants.length + 1;
  const totalPages = Math.ceil(total / TILES_PER_PAGE);
  const maxPage = Math.max(0, totalPages - 1);

  const [page, setPage] = useState(0);
  const viewPage = Math.min(page, maxPage);

  const prev = useCallback(
    () => setPage((p) => Math.max(0, Math.min(p, maxPage) - 1)),
    [maxPage],
  );
  const next = useCallback(
    () => setPage((p) => Math.min(Math.min(p, maxPage) + 1, maxPage)),
    [maxPage],
  );

  const pageStart = viewPage * TILES_PER_PAGE;
  const pageEnd = Math.min(pageStart + TILES_PER_PAGE, total);
  const tilesOnPage = pageEnd - pageStart;
  const lp = localPreviewProps(props);

  return (
    <div className={cn(SHELL_CLASS, className)}>
      <div className="grid min-h-0 min-w-0 flex-1 grid-cols-2 gap-1 auto-rows-fr">
        {Array.from({ length: tilesOnPage }, (_, i) => {
          const tileIdx = pageStart + i;
          if (tileIdx === 0) {
            return <LocalCameraPreview key="local" {...lp} />;
          }
          const participant = remoteParticipants[tileIdx - 1]!;
          return (
            <RemoteParticipantTile
              key={participant.peer.peerId}
              participant={participant}
              className="min-h-0 min-w-0"
            />
          );
        })}
      </div>

      {totalPages > 1 ? (
        <div className="flex shrink-0 items-center justify-between gap-2 px-0.5">
          <button
            type="button"
            onClick={prev}
            disabled={viewPage === 0}
            aria-label="Previous participants"
            className={cn(
              "flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/20",
              viewPage === 0 && "pointer-events-none opacity-30",
            )}
          >
            <ChevronLeft size={18} />
          </button>
          <span className="text-[11px] tabular-nums text-white/70">
            {viewPage + 1} / {totalPages}
          </span>
          <button
            type="button"
            onClick={next}
            disabled={viewPage >= maxPage}
            aria-label="Next participants"
            className={cn(
              "flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/20",
              viewPage >= maxPage && "pointer-events-none opacity-30",
            )}
          >
            <ChevronRight size={18} />
          </button>
        </div>
      ) : null}
    </div>
  );
}

export function ScreenShareMobileParticipantGrid(props: ScreenShareMobileParticipantGridProps) {
  const { remoteParticipants } = props;
  const headcount = remoteParticipants.length + 1;
  const isThreePeople = headcount === 3 && remoteParticipants.length === 2;

  if (isThreePeople) {
    return <ThreeParticipantShareGrid {...props} />;
  }

  return <PaginatedFourUpGrid {...props} />;
}
