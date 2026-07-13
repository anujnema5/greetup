"use client";

/**
 * Camera tiles under the shared screen (space calls, viewports below `xl` only).
 * On desktop, cameras live in the People panel on the right.
 */
import { CALL_TILE_AVATAR_SIZE_COMPACT } from "@/features/room/call/tiles/tile-styles";
import { LocalParticipantTile } from "@/features/room/call/tiles/my-camera-tile";
import { RemoteParticipantTile } from "@/features/room/call/tiles/peer-camera-tile";
import { CameraTilePageButtons } from "@/features/room/call/components/pagination/camera-tile-page-buttons";
import {
  isLiveSpeakerOnTile,
  isYouTheLiveSpeaker,
} from "@/features/room/lib/call/active-speaker";
import { useParticipantsWithSpeakerFirst } from "@/features/room/hooks/call/use-participants-with-speaker-first";
import { useTileGridPage } from "@/features/room/hooks/call/use-tile-grid-page";
import { cn } from "@/lib/utils";
import type { CamerasUnderScreenShareProps } from "./types";

function remoteKickProps(p: CamerasUnderScreenShareProps) {
  return {
    canKick: Boolean(p.isSpaceHost && p.onKickParticipant),
    onKickParticipant: p.onKickParticipant,
    kickingUserId: p.kickingUserId ?? null,
  };
}

const TILES_PER_PAGE = 4;
const SHELL_CLASS = "flex min-h-0 min-w-0 flex-1 flex-col gap-1";

type LocalPreviewProps = Omit<CamerasUnderScreenShareProps, "remoteParticipants" | "className">;

function YourCameraTile({
  localVideoRef,
  localVideoLive,
  localStream,
  myName,
  myInitial,
  myAvatarUrl,
  micEnabled,
  cameraEnabled,
  currentUserId = null,
  liveSpeakerPeerId = null,
  className,
}: LocalPreviewProps & { className?: string }) {
  const youAreSpeaking = isYouTheLiveSpeaker(liveSpeakerPeerId, currentUserId);
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
      isLiveSpeaker={youAreSpeaking}
      avatarSizeClass={CALL_TILE_AVATAR_SIZE_COMPACT}
      className={className}
    />
  );
}

function localTileProps(p: CamerasUnderScreenShareProps): LocalPreviewProps {
  const { remoteParticipants: _r, className: _c, liveSpeakerSpeakingMs: _t, ...rest } = p;
  return rest;
}

/** You + exactly two remotes: [peer][peer] / [You full width]. */
function ThreePeopleUnderShare(props: CamerasUnderScreenShareProps) {
  const {
    className,
    remoteParticipants,
    liveSpeakerPeerId = null,
    liveSpeakerSpeakingMs = {},
  } = props;
  const { participantsWithSpeakerFirst } = useParticipantsWithSpeakerFirst(
    remoteParticipants,
    liveSpeakerPeerId,
    liveSpeakerSpeakingMs,
  );
  const [leftRemote, rightRemote] = participantsWithSpeakerFirst;
  const kick = remoteKickProps(props);

  return (
    <div className={cn(SHELL_CLASS, className)}>
      <div className="grid min-h-0 min-w-0 flex-1 grid-cols-2 grid-rows-[minmax(0,1fr)_minmax(0,1.12fr)] gap-1">
        <RemoteParticipantTile
          participant={leftRemote}
          className="min-h-0 min-w-0"
          avatarSizeClass={CALL_TILE_AVATAR_SIZE_COMPACT}
          isLiveSpeaker={isLiveSpeakerOnTile(liveSpeakerPeerId, leftRemote.peer.peerId)}
          {...kick}
        />
        <RemoteParticipantTile
          participant={rightRemote}
          className="min-h-0 min-w-0"
          avatarSizeClass={CALL_TILE_AVATAR_SIZE_COMPACT}
          isLiveSpeaker={isLiveSpeakerOnTile(liveSpeakerPeerId, rightRemote.peer.peerId)}
          {...kick}
        />
        <YourCameraTile {...localTileProps(props)} className="col-span-2 min-h-0" />
      </div>
    </div>
  );
}

function FourUpPaginatedGrid(props: CamerasUnderScreenShareProps) {
  const {
    className,
    remoteParticipants,
    liveSpeakerPeerId = null,
    liveSpeakerSpeakingMs = {},
  } = props;

  const { participantsWithSpeakerFirst, lockedSpeakerPeerId } = useParticipantsWithSpeakerFirst(
    remoteParticipants,
    liveSpeakerPeerId,
    liveSpeakerSpeakingMs,
  );

  const total = participantsWithSpeakerFirst.length + 1;
  const totalPages = Math.ceil(total / TILES_PER_PAGE);
  const { currentPage, goToPreviousPage, goToNextPage } = useTileGridPage(
    totalPages,
    lockedSpeakerPeerId,
  );

  const pageStart = currentPage * TILES_PER_PAGE;
  const pageEnd = Math.min(pageStart + TILES_PER_PAGE, total);
  const tilesOnPage = pageEnd - pageStart;
  const localProps = localTileProps(props);
  const kick = remoteKickProps(props);

  return (
    <div className={cn(SHELL_CLASS, className)}>
      <div className="grid min-h-0 min-w-0 flex-1 grid-cols-2 gap-1 auto-rows-fr">
        {Array.from({ length: tilesOnPage }, (_, i) => {
          const tileIdx = pageStart + i;
          if (tileIdx === 0) {
            return <YourCameraTile key="local" {...localProps} />;
          }
          const participant = participantsWithSpeakerFirst[tileIdx - 1]!;
          return (
            <RemoteParticipantTile
              key={participant.peer.peerId}
              participant={participant}
              className="min-h-0 min-w-0"
              avatarSizeClass={CALL_TILE_AVATAR_SIZE_COMPACT}
              isLiveSpeaker={isLiveSpeakerOnTile(
                liveSpeakerPeerId,
                participant.peer.peerId,
              )}
              {...kick}
            />
          );
        })}
      </div>

      {totalPages > 1 ? (
        <CameraTilePageButtons
          look="underScreenShare"
          currentPage={currentPage}
          totalPages={totalPages}
          onPreviousPage={goToPreviousPage}
          onNextPage={goToNextPage}
        />
      ) : null}
    </div>
  );
}

export function CamerasUnderScreenShare(props: CamerasUnderScreenShareProps) {
  const { remoteParticipants } = props;
  const headcount = remoteParticipants.length + 1;
  const threePeople = headcount === 3 && remoteParticipants.length === 2;

  if (threePeople) {
    return <ThreePeopleUnderShare {...props} />;
  }

  return <FourUpPaginatedGrid {...props} />;
}
