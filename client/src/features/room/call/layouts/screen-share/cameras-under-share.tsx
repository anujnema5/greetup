"use client";

/**
 * Camera tiles under the main screen-share region (circle calls, narrow viewport).
 *
 * Layouts:
 * - **3 people** — top row: two remotes; bottom: your camera full width.
 * - **4+ people** — 2×2 pages with prev/next (4 tiles per page, local included in order).
 */
import { useCallback, useEffect, useState, type RefObject } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import type { RemoteParticipant } from "@/features/rtc";
import { CALL_TILE_AVATAR_SIZE_COMPACT } from "@/features/room/call/tiles/tile-styles";
import { LocalParticipantTile } from "@/features/room/call/tiles/my-camera-tile";
import { RemoteParticipantTile } from "@/features/room/call/tiles/peer-camera-tile";
import {
  isDominantSpeakerLocalUser,
  isDominantSpeakerPeer,
} from "@/features/room/lib/call/dominant-speaker-tile";
import { usePaginatedRemoteOrder } from "@/features/room/lib/call/use-paginated-remote-order";

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
  currentUserId?: string | null;
  dominantSpeakerPeerId?: string | null;
  dominantSpeakerSpeakingMs?: Record<string, number>;
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
  currentUserId = null,
  dominantSpeakerPeerId = null,
  className,
}: LocalPreviewProps & { className?: string }) {
  const localDominant = isDominantSpeakerLocalUser(dominantSpeakerPeerId, currentUserId);
  return (
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
      avatarSizeClass={CALL_TILE_AVATAR_SIZE_COMPACT}
      className={className}
    />
  );
}

function localPreviewProps(p: ScreenShareMobileParticipantGridProps): LocalPreviewProps {
  const { remoteParticipants: _r, className: _c, dominantSpeakerSpeakingMs: _t, ...rest } = p;
  return rest;
}

/** You + exactly two remotes: [peer][peer] / [You full width]. */
function ThreeParticipantShareGrid(props: ScreenShareMobileParticipantGridProps) {
  const {
    className,
    remoteParticipants,
    dominantSpeakerPeerId = null,
    dominantSpeakerSpeakingMs = {},
  } = props;
  const { orderedRemotes } = usePaginatedRemoteOrder(
    remoteParticipants,
    dominantSpeakerPeerId,
    dominantSpeakerSpeakingMs,
  );
  const [leftRemote, rightRemote] = orderedRemotes;

  return (
    <div className={cn(SHELL_CLASS, className)}>
      <div className="grid min-h-0 min-w-0 flex-1 grid-cols-2 grid-rows-[minmax(0,1fr)_minmax(0,1.12fr)] gap-1">
        <RemoteParticipantTile
          participant={leftRemote}
          className="min-h-0 min-w-0"
          avatarSizeClass={CALL_TILE_AVATAR_SIZE_COMPACT}
          isDominantSpeaker={isDominantSpeakerPeer(dominantSpeakerPeerId, leftRemote.peer.peerId)}
        />
        <RemoteParticipantTile
          participant={rightRemote}
          className="min-h-0 min-w-0"
          avatarSizeClass={CALL_TILE_AVATAR_SIZE_COMPACT}
          isDominantSpeaker={isDominantSpeakerPeer(dominantSpeakerPeerId, rightRemote.peer.peerId)}
        />
        <LocalCameraPreview
          {...localPreviewProps(props)}
          className="col-span-2 min-h-0"
        />
      </div>
    </div>
  );
}

function PaginatedFourUpGrid(props: ScreenShareMobileParticipantGridProps) {
  const {
    className,
    remoteParticipants,
    dominantSpeakerPeerId = null,
    dominantSpeakerSpeakingMs = {},
  } = props;

  const { orderedRemotes, anchorPeerId } = usePaginatedRemoteOrder(
    remoteParticipants,
    dominantSpeakerPeerId,
    dominantSpeakerSpeakingMs,
  );

  const total = orderedRemotes.length + 1;
  const totalPages = Math.ceil(total / TILES_PER_PAGE);
  const maxPage = Math.max(0, totalPages - 1);

  const [page, setPage] = useState(0);
  const viewPage = Math.min(page, maxPage);

  useEffect(() => {
    setPage(0);
  }, [anchorPeerId]);

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
          const participant = orderedRemotes[tileIdx - 1]!;
          return (
            <RemoteParticipantTile
              key={participant.peer.peerId}
              participant={participant}
              className="min-h-0 min-w-0"
              avatarSizeClass={CALL_TILE_AVATAR_SIZE_COMPACT}
              isDominantSpeaker={isDominantSpeakerPeer(dominantSpeakerPeerId, participant.peer.peerId)}
            />
          );
        })}
      </div>

      {totalPages > 1 ? (
        <div className="flex w-full shrink-0 items-center justify-between gap-2 px-0.5 md:px-1">
          <button
            type="button"
            onClick={prev}
            disabled={viewPage === 0}
            aria-label={`Previous participants, page ${viewPage + 1} of ${totalPages}`}
            className={cn(
              "flex h-8 min-w-8 items-center justify-center rounded-md border border-white/15 bg-white/10 px-2 text-[11px] font-medium text-white transition hover:bg-white/20 md:h-9",
              viewPage === 0 && "pointer-events-none opacity-30",
            )}
          >
            <span className="inline-flex items-center gap-0.5">
              <ChevronLeft size={18} className="shrink-0" />
              <span className="hidden sm:inline">Prev</span>
            </span>
          </button>
          <span className="sr-only">
            Page {viewPage + 1} of {totalPages}
          </span>
          <button
            type="button"
            onClick={next}
            disabled={viewPage >= maxPage}
            aria-label={`Next participants, page ${viewPage + 1} of ${totalPages}`}
            className={cn(
              "flex h-8 min-w-8 items-center justify-center rounded-md border border-white/15 bg-white/10 px-2 text-[11px] font-medium text-white transition hover:bg-white/20 md:h-9",
              viewPage >= maxPage && "pointer-events-none opacity-30",
            )}
          >
            <span className="inline-flex items-center gap-0.5">
              <span className="hidden sm:inline">Next</span>
              <ChevronRight size={18} className="shrink-0" />
            </span>
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
