"use client";

/**
 * People tab cameras (+ optional shared-screen picker).
 *
 * Layout: 1–2 participants → single column, 16:9 tiles. 3+ → 2-column grid with `1fr` row heights
 * (fills panel height), 3-up = two on row 1 + full-width row 2, 4 = 2×2, 5+ → pages of 4 + pagination.
 * Local tile is always built first so it is not the last slot on a page.
 */
import Image from "next/image";
import { cloneElement, useMemo, useRef, type ReactElement } from "react";
import { Monitor } from "lucide-react";
import type { RemoteParticipant, RemotePeer, ScreenShareTileInfo } from "@/features/rtc/types/mediasoup-room.types";
import {
  hasLiveEnabledVideo,
  hasRenderableRemoteVideo,
  mediaStreamVideoAttachRevision,
} from "@/features/rtc";
import {
  useAttachMediaStream,
  useRerenderOnVideoTrackMuteCycle,
} from "@/features/room/hooks/media/use-attach-media-stream";
import { SharedScreensChooser } from "@/features/room/call/layouts/screen-share/screen-share-strip";
import { TileNameBadge, TileSpeakingRings } from "@/features/room/call/tiles/tile-primitives";
import {
  LIVE_SPEAKER_TILE_RING,
  isYouTheLiveSpeaker,
  isLiveSpeakerOnTile,
} from "@/features/room/lib/call/active-speaker";
import {
  ParticipantTileControlsBar,
  TileMediaControlsBar,
} from "@/features/room/call/tiles/parts/tile-participant-controls-bar";
import type { OnRemoveCircleParticipant } from "@/features/room/types/call/participant-remove.types";
import { CircleParticipantRoster } from "@/features/room/call/panels/sidebar/participant-roster";
import { CameraTilePageButtons } from "@/features/room/call/components/pagination/camera-tile-page-buttons";
import { useTileGridPage } from "@/features/room/hooks/call/use-tile-grid-page";
import { usePeoplePanelCameraOrder } from "@/features/room/hooks/call/use-people-panel-camera-order";
import { getProfileImageUrl } from "@/lib/ui/profile-image";
import { cn } from "@/lib/utils";

/** Tiles per page when roster is in 2-column grid mode (2×2). */
const GRID_PAGE_SIZE = 4;
/** From this many cameras onward, use a 2-column grid for everyone (no “3 stacked + 1 tiny”). */
const MIN_CAMERAS_FOR_GRID_LAYOUT = 3;
const CAMERA_TILE_CLASS = "min-h-0 w-full";

type ParticipantVideoTileProps = {
  label: string;
  stream: MediaStream | null;
  cameraOff: boolean;
  micOff: boolean;
  imageUrl?: string | null;
  isSelf?: boolean;
  mirrored?: boolean;
  sharingScreen: boolean;
  shareTileKey: string | null;
  shareIsFocused: boolean;
  onSelectShare?: (key: string) => void;
  allowPickShareFromTile?: boolean;
  tileClassName?: string;
  /** `fill` = stretch with grid `1fr` rows; `square` = 1:1; `video` = 16:9 column strip. */
  tileAspect?: "video" | "square" | "fill";
  isLiveSpeaker?: boolean;
  participantUserId?: string;
  canKick?: boolean;
  kickingUserId?: string | null;
  onKickParticipant?: OnRemoveCircleParticipant;
};

function shareTileKeyForPeer(tiles: ScreenShareTileInfo[], peerId: string | "local"): string | null {
  return tiles.find((x) => x.peerId === peerId)?.key ?? null;
}

/** Equal-height rows so the camera grid consumes available panel height. */
function cameraGridRowTemplate(tileCount: number): string {
  if (tileCount <= 2) return "grid-rows-[minmax(0,1fr)]";
  return "grid-rows-[minmax(0,1fr)_minmax(0,1fr)]";
}

function ParticipantVideoTile({
  label,
  stream,
  cameraOff,
  micOff,
  imageUrl,
  isSelf,
  mirrored,
  sharingScreen,
  shareTileKey,
  shareIsFocused,
  onSelectShare,
  allowPickShareFromTile = true,
  tileClassName,
  tileAspect = "video",
  isLiveSpeaker = false,
  participantUserId,
  canKick = false,
  kickingUserId = null,
  onKickParticipant,
}: ParticipantVideoTileProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const muteCycle = useRerenderOnVideoTrackMuteCycle(stream);
  const videoReady = isSelf
    ? Boolean(stream && hasLiveEnabledVideo(stream) && !cameraOff)
    : Boolean(stream && hasRenderableRemoteVideo(stream) && !cameraOff);
  const attachStream = videoReady ? stream : null;
  const attachKey = `${muteCycle}:${videoReady ? 1 : 0}:${mediaStreamVideoAttachRevision(stream)}`;
  useAttachMediaStream(videoRef, attachStream, attachKey, {
    cloneVideoTracksForPlayback: Boolean(isSelf),
  });

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

  const canPickShare = Boolean(sharingScreen && shareTileKey && onSelectShare && allowPickShareFromTile);

  const shellClass = cn(
    "relative w-full overflow-hidden rounded-xl border border-border/60 bg-muted/20 shadow-sm",
    tileAspect === "fill" && "h-full min-h-0",
    tileAspect === "square" && "aspect-square",
    tileAspect === "video" && "aspect-video",
    shareIsFocused && "ring-2 ring-primary ring-offset-2 ring-offset-background",
    // Avoid stacking primary + emerald rings + glow in the same corner as tile controls.
    isLiveSpeaker && !shareIsFocused && LIVE_SPEAKER_TILE_RING,
    canPickShare && "cursor-pointer transition-[box-shadow,transform] hover:ring-2 hover:ring-primary/50",
    tileClassName,
  );

  const showVideo = Boolean(mirrored || videoReady);

  const inner = (
    <>
      {showVideo ? (
        <video
          key={attachKey}
          ref={videoRef}
          playsInline
          autoPlay
          muted
          className={cn(
            "absolute inset-0 h-full w-full object-cover",
            mirrored && "-scale-x-100",
            mirrored && !videoReady && "opacity-0",
          )}
        />
      ) : null}
      {!videoReady ? (
        <div className="absolute inset-0 flex items-center justify-center bg-muted/30">
          <TileSpeakingRings stream={micOff ? null : stream}>
            <div className="relative h-16 w-16 overflow-hidden rounded-full border border-border bg-muted shadow-sm">
              {imageUrl?.trim() ? (
                <Image
                  src={getProfileImageUrl(imageUrl)}
                  alt=""
                  fill
                  className="object-cover"
                  sizes="64px"
                  unoptimized
                  loading="eager"
                />
              ) : (
                <span className="flex h-full w-full items-center justify-center text-lg font-bold text-foreground">
                  {initials || "?"}
                </span>
              )}
            </div>
          </TileSpeakingRings>
        </div>
      ) : null}
      <TileNameBadge
        className={cn(
          "max-w-[min(100%-4rem,12rem)] truncate border-white/10 bg-black/55 text-white/90",
          isSelf && "border-primary/30",
        )}
      >
        {label}
      </TileNameBadge>
      {isSelf || !participantUserId ? (
        <TileMediaControlsBar
          micOn={!micOff}
          cameraOn={!cameraOff}
          className={cn(
            (shareIsFocused || isLiveSpeaker) && "bottom-3 right-3 sm:bottom-3.5 sm:right-3.5",
          )}
        />
      ) : (
        <ParticipantTileControlsBar
          micOn={!micOff}
          cameraOn={!cameraOff}
          userId={participantUserId}
          displayName={label}
          canKick={canKick}
          kickingUserId={kickingUserId}
          onKickParticipant={onKickParticipant}
          className={cn(
            (shareIsFocused || isLiveSpeaker) && "bottom-3 right-3 sm:bottom-3.5 sm:right-3.5",
          )}
        />
      )}
      {sharingScreen ? (
        <div className="pointer-events-none absolute left-2 top-2 flex items-center gap-1 rounded-md bg-black/55 px-1.5 py-0.5 text-[10px] font-semibold text-white/95 backdrop-blur-sm">
          <Monitor size={12} className="shrink-0" />
          Sharing
        </div>
      ) : null}
    </>
  );

  return (
    <div
      className={shellClass}
      {...(canPickShare
        ? {
            role: "button" as const,
            tabIndex: 0,
            onClick: () => shareTileKey && onSelectShare?.(shareTileKey),
            onKeyDown: (e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                shareTileKey && onSelectShare?.(shareTileKey);
              }
            },
            "aria-label": `Show ${label}'s screen on the main stage`,
          }
        : {})}
    >
      {inner}
    </div>
  );
}

/** Applies `col-span-2` for 3-up (bottom row) and single-tile pages; stretches cells to row height. */
function withGridTileLayout(
  tiles: ReactElement<ParticipantVideoTileProps>[],
): ReactElement<ParticipantVideoTileProps>[] {
  const n = tiles.length;
  return tiles.map((el, i) => {
    const prevClass = el.props.tileClassName;
    const spanThird = n === 3 && i === 2;
    const spanSingle = n === 1;
    return cloneElement(el, {
      tileClassName: cn(prevClass, "h-full min-h-0 min-w-0", (spanThird || spanSingle) && "col-span-2"),
    });
  });
}

type CameraTilesContext = {
  allowPickShareFromTile: boolean;
  cameraEnabled: boolean;
  directPeerAvatarUrl?: string | null;
  directPeerLabel: string;
  focusedScreenShareKey: string | null;
  isGroupRoom: boolean;
  localShareKey: string | null;
  localStream: MediaStream | null;
  micEnabled: boolean;
  myAvatarUrl?: string | null;
  myName: string;
  onSelectScreenShare?: (key: string) => void;
  peerStreamById: Map<string, MediaStream>;
  remoteIds: string[];
  remotePeerCameraOff: boolean;
  remotePeerCameraStream: MediaStream | null;
  remotePeerMicOff: boolean;
  remotePeers: Record<string, RemotePeer>;
  screenShareTiles: ScreenShareTileInfo[];
  screenSharing: boolean;
  /** When true (3+ roster), tiles use `fill` to grow with grid `1fr` rows; else 16:9 column strip. */
  stretchTilesInGrid: boolean;
  currentUserId: string | null;
  liveSpeakerPeerId: string | null;
  isCircleHost?: boolean;
  onKickParticipant?: OnRemoveCircleParticipant;
  kickingUserId?: string | null;
};

function buildCameraTiles(p: CameraTilesContext): ReactElement<ParticipantVideoTileProps>[] {
  const aspect = p.stretchTilesInGrid ? ("fill" as const) : ("video" as const);
  const canKickRemote = Boolean(p.isCircleHost && p.onKickParticipant);
  const base = {
    allowPickShareFromTile: p.allowPickShareFromTile,
    onSelectShare: p.onSelectScreenShare,
    tileClassName: CAMERA_TILE_CLASS,
    tileAspect: aspect,
    canKick: canKickRemote,
    kickingUserId: p.kickingUserId ?? null,
    onKickParticipant: p.onKickParticipant,
  } as const;

  /** Local preview first so it never lands as the last tile in a 2×2 page. */
  const selfIsLiveSpeaker = isYouTheLiveSpeaker(p.liveSpeakerPeerId, p.currentUserId);

  const tiles: ReactElement<ParticipantVideoTileProps>[] = [
    <ParticipantVideoTile
      key={`self:${mediaStreamVideoAttachRevision(p.localStream)}`}
      label={`${p.myName} (you)`}
      stream={p.localStream}
      cameraOff={!p.cameraEnabled}
      micOff={!p.micEnabled}
      imageUrl={p.myAvatarUrl}
      isSelf
      mirrored
      sharingScreen={p.screenSharing}
      shareTileKey={p.localShareKey}
      shareIsFocused={Boolean(p.localShareKey && p.focusedScreenShareKey === p.localShareKey)}
      isLiveSpeaker={selfIsLiveSpeaker}
      {...base}
    />,
  ];

  if (p.isGroupRoom) {
    for (const id of p.remoteIds) {
      const peer = p.remotePeers[id]!;
      const label = peer.displayName?.trim() || `Peer ${id.slice(0, 6)}`;
      const stream = p.peerStreamById.get(id) ?? null;
      const shareKey = shareTileKeyForPeer(p.screenShareTiles, id);
      tiles.push(
        <ParticipantVideoTile
          key={`${id}:${mediaStreamVideoAttachRevision(stream)}`}
          label={label}
          stream={stream}
          cameraOff={peer.cameraActive === false}
          micOff={peer.micActive === false}
          imageUrl={peer.image}
          participantUserId={id}
          sharingScreen={p.screenShareTiles.some((t) => t.peerId === id)}
          shareTileKey={shareKey}
          shareIsFocused={Boolean(shareKey && p.focusedScreenShareKey === shareKey)}
          isLiveSpeaker={isLiveSpeakerOnTile(p.liveSpeakerPeerId, id)}
          {...base}
        />,
      );
    }
    return tiles;
  }

  if (p.remoteIds.length > 0) {
    for (const id of p.remoteIds) {
      const peer = p.remotePeers[id]!;
      const label = peer.displayName?.trim() || p.directPeerLabel.trim() || `Peer ${id.slice(0, 6)}`;
      const shareKey = shareTileKeyForPeer(p.screenShareTiles, id);
      tiles.push(
        <ParticipantVideoTile
          key={id}
          label={label}
          stream={p.remotePeerCameraStream}
          cameraOff={peer.cameraActive === false || p.remotePeerCameraOff}
          micOff={peer.micActive === false || p.remotePeerMicOff}
          imageUrl={peer.image ?? p.directPeerAvatarUrl}
          participantUserId={id}
          sharingScreen={p.screenShareTiles.some((t) => t.peerId === id)}
          shareTileKey={shareKey}
          shareIsFocused={Boolean(shareKey && p.focusedScreenShareKey === shareKey)}
          isLiveSpeaker={isLiveSpeakerOnTile(p.liveSpeakerPeerId, id)}
          {...base}
        />,
      );
    }
    return tiles;
  }

  if (p.directPeerLabel.trim()) {
    const remoteShare = p.screenShareTiles.find((t) => t.peerId !== "local");
    const fallbackPeerId = p.remoteIds[0] ?? null;
    tiles.push(
      <ParticipantVideoTile
        key="direct-fallback"
        label={p.directPeerLabel}
        stream={p.remotePeerCameraStream}
        cameraOff={p.remotePeerCameraOff}
        micOff={p.remotePeerMicOff}
        imageUrl={p.directPeerAvatarUrl}
        sharingScreen={Boolean(remoteShare)}
        shareTileKey={remoteShare?.key ?? null}
        shareIsFocused={Boolean(remoteShare && p.focusedScreenShareKey === remoteShare.key)}
        isLiveSpeaker={Boolean(
          fallbackPeerId && isLiveSpeakerOnTile(p.liveSpeakerPeerId, fallbackPeerId),
        )}
        {...base}
      />,
    );
  }

  return tiles;
}

export function RoomCallParticipantsPanel({
  isGroupRoom,
  myName,
  myAvatarUrl,
  micEnabled,
  cameraEnabled,
  screenSharing,
  remotePeers,
  directPeerLabel,
  directPeerAvatarUrl,
  remotePeerMicOff,
  remotePeerCameraOff,
  screenShareTiles,
  focusedScreenShareKey,
  onSelectScreenShare,
  groupGalleryParticipants,
  localStream,
  remotePeerCameraStream,
  /** When true, hide camera tiles (e.g. activity layout already shows them). */
  suppressCameraTiles = false,
  currentUserId = null,
  liveSpeakerPeerId = null,
  liveSpeakerSpeakingMs = {},
  isCircleHost = false,
  onKickParticipant,
  kickingUserId = null,
}: {
  isGroupRoom: boolean;
  myName: string;
  myAvatarUrl?: string | null;
  micEnabled: boolean;
  cameraEnabled: boolean;
  screenSharing: boolean;
  remotePeers: Record<string, RemotePeer>;
  directPeerLabel: string;
  directPeerAvatarUrl?: string | null;
  remotePeerMicOff: boolean;
  remotePeerCameraOff: boolean;
  screenShareTiles: ScreenShareTileInfo[];
  focusedScreenShareKey: string | null;
  onSelectScreenShare?: (key: string) => void;
  groupGalleryParticipants: RemoteParticipant[];
  localStream: MediaStream | null;
  remotePeerCameraStream: MediaStream | null;
  suppressCameraTiles?: boolean;
  currentUserId?: string | null;
  liveSpeakerPeerId?: string | null;
  liveSpeakerSpeakingMs?: Record<string, number>;
  isCircleHost?: boolean;
  onKickParticipant?: OnRemoveCircleParticipant;
  kickingUserId?: string | null;
}) {
  const { allPeerIds, peerIdsWithSpeakerFirst, lockedSpeakerPeerId } = usePeoplePanelCameraOrder(
    remotePeers,
    liveSpeakerPeerId,
    liveSpeakerSpeakingMs,
  );
  const allowPickShareFromTile = screenShareTiles.length <= 1;
  const localShareKey = shareTileKeyForPeer(screenShareTiles, "local");

  const peerStreamById = useMemo(() => {
    const m = new Map<string, MediaStream>();
    for (const { peer, stream } of groupGalleryParticipants) {
      m.set(peer.peerId, stream);
    }
    return m;
  }, [groupGalleryParticipants]);

  const expectedCameraCount = useMemo(() => {
    if (isGroupRoom) return 1 + allPeerIds.length;
    if (allPeerIds.length > 0) return 1 + allPeerIds.length;
    if (directPeerLabel.trim()) return 2;
    return 1;
  }, [directPeerLabel, isGroupRoom, allPeerIds]);

  const stretchTilesInGrid = expectedCameraCount >= MIN_CAMERAS_FOR_GRID_LAYOUT;

  const cameraTiles = useMemo(
    () =>
      buildCameraTiles({
        allowPickShareFromTile,
        cameraEnabled,
        directPeerAvatarUrl,
        directPeerLabel,
        focusedScreenShareKey,
        isGroupRoom,
        localShareKey,
        localStream,
        micEnabled,
        myAvatarUrl,
        myName,
        onSelectScreenShare,
        peerStreamById,
        remoteIds: peerIdsWithSpeakerFirst,
        remotePeerCameraOff,
        remotePeerCameraStream,
        remotePeerMicOff,
        remotePeers,
        screenShareTiles,
        screenSharing,
        stretchTilesInGrid,
        currentUserId,
        liveSpeakerPeerId,
        isCircleHost,
        onKickParticipant,
        kickingUserId,
      }),
    [
      allowPickShareFromTile,
      cameraEnabled,
      directPeerAvatarUrl,
      directPeerLabel,
      focusedScreenShareKey,
      isGroupRoom,
      localShareKey,
      localStream,
      micEnabled,
      myAvatarUrl,
      myName,
      onSelectScreenShare,
      peerStreamById,
      peerIdsWithSpeakerFirst,
      remotePeerCameraOff,
      remotePeerCameraStream,
      remotePeerMicOff,
      remotePeers,
      screenShareTiles,
      screenSharing,
      stretchTilesInGrid,
      currentUserId,
      liveSpeakerPeerId,
      isCircleHost,
      onKickParticipant,
      kickingUserId,
    ],
  );

  /** Should match `expectedCameraCount` whenever the roster and `buildCameraTiles` branches stay in sync. */
  const cameraCount = cameraTiles.length;
  const useGridLayout = cameraCount >= MIN_CAMERAS_FOR_GRID_LAYOUT;
  const gridPageCount = useGridLayout ? Math.max(1, Math.ceil(cameraCount / GRID_PAGE_SIZE)) : 1;
  const showGridPagination = useGridLayout && gridPageCount > 1;

  const {
    currentPage: gridPage,
    goToPreviousPage: gridPrev,
    goToNextPage: gridNext,
  } = useTileGridPage(gridPageCount, lockedSpeakerPeerId);

  const visibleCameraTiles = useMemo(() => {
    if (!useGridLayout) return cameraTiles;
    const start = gridPage * GRID_PAGE_SIZE;
    return cameraTiles.slice(start, start + GRID_PAGE_SIZE);
  }, [cameraTiles, gridPage, useGridLayout]);

  const gridLaidOutTiles = useMemo(
    () => (useGridLayout ? withGridTileLayout(visibleCameraTiles) : visibleCameraTiles),
    [useGridLayout, visibleCameraTiles],
  );

  const showParticipantRoster = isGroupRoom;

  return (
    <div className="flex h-full min-h-0 min-w-0 flex-1 flex-col gap-4 overflow-y-auto p-3">
      {showParticipantRoster ? (
        <CircleParticipantRoster
          myName={myName}
          myAvatarUrl={myAvatarUrl}
          currentUserId={currentUserId}
          remotePeers={remotePeers}
          isHost={isCircleHost}
          kickingUserId={kickingUserId}
          onKickParticipant={onKickParticipant}
        />
      ) : null}

      {screenShareTiles.length > 0 && onSelectScreenShare ? (
        <section className="shrink-0">
          <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            Shared screens
          </h3>
          <SharedScreensChooser
            tiles={screenShareTiles}
            focusedKey={focusedScreenShareKey}
            onSelect={onSelectScreenShare}
          />
        </section>
      ) : null}

      <section className="flex min-h-0 flex-1 flex-col">
        {suppressCameraTiles ? (
          <p className="text-xs leading-relaxed text-muted-foreground">
            Camera tiles are shown next to the activity. Use this tab for chat or shared screens.
          </p>
        ) : (
          <>
            <h3 className="mb-2 shrink-0 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              Cameras
            </h3>
            <div className="flex min-h-0 flex-1 flex-col gap-2">
              {useGridLayout ? (
                <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-2">
                  <div
                    className={cn(
                      "grid min-h-0 w-full min-w-0 flex-1 grid-cols-2 gap-2",
                      cameraGridRowTemplate(visibleCameraTiles.length),
                    )}
                  >
                    {gridLaidOutTiles}
                  </div>
                  {showGridPagination ? (
                    <CameraTilePageButtons
                      look="peoplePanel"
                      currentPage={gridPage}
                      totalPages={gridPageCount}
                      onPreviousPage={gridPrev}
                      onNextPage={gridNext}
                    />
                  ) : null}
                </div>
              ) : (
                <div className="flex shrink-0 flex-col gap-2">{cameraTiles}</div>
              )}
            </div>
          </>
        )}
      </section>
    </div>
  );
}
