"use client";

/**
 * Paginated gallery for circle rooms with 7+ participants (6 tiles per page).
 */
import type { RefObject } from "react";
import type { RemoteParticipant } from "@/features/rtc";
import { PaginatedTileGrid } from "@/features/room/call/layouts/grid/paginated-tile-grid";
import { CALL_TILE_AVATAR_SIZE_COMPACT } from "@/features/room/call/tiles/tile-styles";
import { LocalParticipantTile } from "@/features/room/call/tiles/my-camera-tile";
import { RemoteParticipantTile } from "@/features/room/call/tiles/peer-camera-tile";
import {
  isDominantSpeakerLocalUser,
  isDominantSpeakerPeer,
} from "@/features/room/lib/call/dominant-speaker-tile";

const TILES_PER_PAGE = 6;
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
  const total = participants.length + 1;

  return (
    <PaginatedTileGrid
      totalTiles={total}
      tilesPerPage={TILES_PER_PAGE}
      gridClassName={PAGED_GRID}
      shellClassName="absolute inset-0 p-1 md:p-1.5"
      paginationVariant="dots"
      renderTile={(tileIdx, spanFullWidth) => {
        const spanClass = spanFullWidth ? "col-span-full" : undefined;
        if (tileIdx === 0) {
          return (
            <LocalParticipantTile
              key="local"
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
              className={spanClass}
            />
          );
        }
        const participant = participants[tileIdx - 1]!;
        return (
          <RemoteParticipantTile
            key={participant.peer.peerId}
            participant={participant}
            className={spanClass}
            avatarSizeClass={CALL_TILE_AVATAR_SIZE_COMPACT}
            isDominantSpeaker={isDominantSpeakerPeer(
              dominantSpeakerPeerId,
              participant.peer.peerId,
            )}
          />
        );
      }}
    />
  );
}
