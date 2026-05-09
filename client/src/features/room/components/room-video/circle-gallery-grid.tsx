"use client";

/**
 * Paginated gallery for circle rooms with 7+ participants.
 * Shows 6 tiles per page (2×3 on phone, 3×2 on md+).
 * Supports left/right arrow navigation, dot indicators, and touch swipe.
 * For ≤6 participants, the parent uses the adaptive single-page layout instead.
 */
import { useState, useCallback, useRef, useEffect, type RefObject } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import type { RemoteParticipant } from "@/features/rtc";
import { RemoteParticipantTile } from "@/features/room/components/room-video/remote-participant-tile";
import {
  DOMINANT_SPEAKER_TILE_RING,
  isDominantSpeakerLocalUser,
  isDominantSpeakerPeer,
} from "@/features/room/lib/dominant-speaker-tile";
import {
  CameraOffAvatar,
  TileMediaStatus,
  TileNameBadge,
  TileSpeakingRings,
  VideoMirror,
} from "@/features/room/components/room-video/room-video-primitives";

const TILES_PER_PAGE = 6;
// Consistent column layout across all pages: 2 cols on phone, 3 on md+
const PAGED_GRID = "grid-cols-2 md:grid-cols-3";

export function CircleGalleryGrid({
  participants,
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
}: {
  participants: RemoteParticipant[];
  localVideoRef: RefObject<HTMLVideoElement | null>;
  localVideoLive: boolean;
  localStream: MediaStream | null;
  myName: string;
  myInitial: string;
  myAvatarUrl?: string | null;
  micEnabled?: boolean;
  cameraEnabled?: boolean;
  currentUserId?: string | null;
  dominantSpeakerPeerId?: string | null;
}) {
  const localDominant = isDominantSpeakerLocalUser(dominantSpeakerPeerId, currentUserId);
  // Flat tile order: index 0 = local "You", 1..n = remotes
  const total = participants.length + 1;
  const totalPages = Math.ceil(total / TILES_PER_PAGE);

  const [page, setPage] = useState(0);
  // Clamp when someone leaves and the last page disappears
  useEffect(() => {
    setPage((p) => Math.min(p, Math.max(0, totalPages - 1)));
  }, [totalPages]);

  const prev = useCallback(() => setPage((p) => Math.max(0, p - 1)), []);
  const next = useCallback(
    () => setPage((p) => Math.min(totalPages - 1, p + 1)),
    [totalPages],
  );

  // Touch swipe: left = next page, right = prev page
  const touchStartX = useRef(0);

  const pageStart = page * TILES_PER_PAGE;
  const pageEnd = Math.min(pageStart + TILES_PER_PAGE, total);
  const tilesOnPage = pageEnd - pageStart;
  // If this page has only 1 tile, span it across all columns so it fills the width
  const singleTile = tilesOnPage === 1;

  return (
    <div
      className="absolute inset-0 flex flex-col gap-1 p-1 md:p-1.5"
      onTouchStart={(e) => {
        touchStartX.current = e.touches[0]!.clientX;
      }}
      onTouchEnd={(e) => {
        const dx = e.changedTouches[0]!.clientX - touchStartX.current;
        if (Math.abs(dx) > 48) dx < 0 ? next() : prev();
      }}
    >
      {/* Grid — flex-1 fills height above pagination bar */}
      <div className={cn("min-h-0 flex-1 grid auto-rows-fr gap-1", PAGED_GRID)}>
        {Array.from({ length: tilesOnPage }, (_, i) => {
          const tileIdx = pageStart + i;
          const spanClass = singleTile ? "col-span-full" : undefined;

          if (tileIdx === 0) {
            return (
              <div
                key="local"
                className={cn(
                  "relative flex min-h-0 min-w-0 flex-col overflow-hidden rounded-xl border border-border/50 shadow-sm",
                  localDominant && DOMINANT_SPEAKER_TILE_RING,
                  spanClass,
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
                {!localVideoLive && (
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
                )}
                <TileNameBadge>You</TileNameBadge>
                <TileMediaStatus micOn={micEnabled} cameraOn={cameraEnabled} />
              </div>
            );
          }

          const participant = participants[tileIdx - 1]!;
          return (
            <RemoteParticipantTile
              key={participant.peer.peerId}
              participant={participant}
              className={spanClass}
              isDominantSpeaker={isDominantSpeakerPeer(dominantSpeakerPeerId, participant.peer.peerId)}
            />
          );
        })}
      </div>

      {/* Pagination bar — only shown when there are multiple pages */}
      {totalPages > 1 && (
        <div className="flex shrink-0 items-center justify-center gap-3 py-0.5">
          <button
            type="button"
            onClick={prev}
            disabled={page === 0}
            aria-label="Previous page"
            className={cn(
              "flex h-7 w-7 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/20",
              page === 0 && "pointer-events-none opacity-30",
            )}
          >
            <ChevronLeft size={16} />
          </button>

          {/* Dot indicators: active dot is a pill, inactive are small circles */}
          <div className="flex items-center gap-1.5">
            {Array.from({ length: totalPages }, (_, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setPage(i)}
                aria-label={`Page ${i + 1}`}
                className={cn(
                  "rounded-full bg-white transition-all duration-200",
                  i === page
                    ? "h-2 w-5 opacity-100"
                    : "h-1.5 w-1.5 opacity-40 hover:opacity-70",
                )}
              />
            ))}
          </div>

          <button
            type="button"
            onClick={next}
            disabled={page === totalPages - 1}
            aria-label="Next page"
            className={cn(
              "flex h-7 w-7 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/20",
              page === totalPages - 1 && "pointer-events-none opacity-30",
            )}
          >
            <ChevronRight size={16} />
          </button>
        </div>
      )}
    </div>
  );
}
