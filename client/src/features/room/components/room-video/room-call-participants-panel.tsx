"use client";

/**
 * People tab during screen share: full-width camera tiles + tap-to-focus when multiple shares.
 *
 * Self-view uses {@link VideoMirror}, which copies `srcObject` from a **source** `<video>` into
 * its own display element. That source must stay mounted — see `ParticipantVideoTile` (mirrored branch).
 */
import Image from "next/image";
import { useMemo, useRef } from "react";
import { Monitor } from "lucide-react";
import { sortPeerIds } from "@/features/rtc/lib/remote-participant-streams";
import type { RemoteParticipant, RemotePeer, ScreenShareTileInfo } from "@/features/rtc/types/mediasoup-room.types";
import { hasLiveVideo } from "@/features/rtc";
import { useAttachMediaStream } from "@/features/room/hooks/use-attach-media-stream";
import { SharedScreensChooser } from "@/features/room/components/room-video/screen-share-filmstrip";
import { TileMediaStatus, TileNameBadge, TileSpeakingRings, VideoMirror } from "@/features/room/components/room-video/room-video-primitives";
import { getProfileImageUrl } from "@/lib/ui/profile-image";
import { cn } from "@/lib/utils";

function shareTileKeyForPeer(tiles: ScreenShareTileInfo[], peerId: string | "local"): string | null {
  const t = tiles.find((x) => x.peerId === peerId);
  return t?.key ?? null;
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
}: {
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
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const live = Boolean(stream && hasLiveVideo(stream) && !cameraOff);
  useAttachMediaStream(videoRef, live ? stream : null, live);

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
    "aspect-video",
    shareIsFocused && "ring-2 ring-primary ring-offset-2 ring-offset-background",
    canPickShare && "cursor-pointer transition-[box-shadow,transform] hover:ring-2 hover:ring-primary/50",
  );

  const inner = (
    <>
      {mirrored ? (
        <>
          {/*
            VideoMirror only *reads* srcRef — it does not render that node. Without this hidden
            element, videoRef.current stays null and the self preview stays black.
          */}
          <video
            ref={videoRef}
            playsInline
            autoPlay
            muted
            className="pointer-events-none absolute h-px w-px opacity-0"
            aria-hidden
          />
          <VideoMirror
            srcRef={videoRef}
            mirrored
            className={cn("absolute inset-0 h-full w-full object-cover", !live && "opacity-0")}
          />
        </>
      ) : live ? (
        <video ref={videoRef} playsInline autoPlay className="absolute inset-0 h-full w-full object-cover" />
      ) : null}
      {!live ? (
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
      <TileMediaStatus micOn={!micOff} cameraOn={!cameraOff} />
      {sharingScreen ? (
        <div className="pointer-events-none absolute left-2 top-2 flex items-center gap-1 rounded-md bg-black/55 px-1.5 py-0.5 text-[10px] font-semibold text-white/95 backdrop-blur-sm">
          <Monitor size={12} className="shrink-0" />
          Sharing
        </div>
      ) : null}
    </>
  );

  if (canPickShare) {
    return (
      <button
        type="button"
        className={cn(shellClass, "block w-full border-0 bg-transparent p-0 text-left")}
        onClick={() => shareTileKey && onSelectShare?.(shareTileKey)}
        aria-label={`Show ${label}'s screen on the main stage`}
      >
        {inner}
      </button>
    );
  }

  return <div className={shellClass}>{inner}</div>;
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
  /** Circle: camera-only streams aligned with roster. */
  groupGalleryParticipants: RemoteParticipant[];
  localStream: MediaStream | null;
  /** Direct: partner camera stream for the sidebar tile. */
  remotePeerCameraStream: MediaStream | null;
}) {
  const remoteIds = sortPeerIds(Object.keys(remotePeers));
  /** Prefer the numbered list for switching; keep tile tap only for a single share. */
  const allowPickShareFromTile = screenShareTiles.length <= 1;
  const localShareKey = shareTileKeyForPeer(screenShareTiles, "local");

  const peerStreamById = useMemo(() => {
    const m = new Map<string, MediaStream>();
    for (const { peer, stream } of groupGalleryParticipants) {
      m.set(peer.peerId, stream);
    }
    return m;
  }, [groupGalleryParticipants]);

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto p-3">
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

      <section className="min-h-0 flex-1">
        <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          Cameras
        </h3>
        <div className="flex flex-col gap-2.5">
          <ParticipantVideoTile
            label={`${myName} (you)`}
            stream={localStream}
            cameraOff={!cameraEnabled}
            micOff={!micEnabled}
            imageUrl={myAvatarUrl}
            isSelf
            mirrored
            sharingScreen={screenSharing}
            shareTileKey={localShareKey}
            shareIsFocused={Boolean(localShareKey && focusedScreenShareKey === localShareKey)}
            onSelectShare={onSelectScreenShare}
            allowPickShareFromTile={allowPickShareFromTile}
          />

          {isGroupRoom
            ? remoteIds.map((id) => {
                const p = remotePeers[id]!;
                const nm = p.displayName?.trim() || `Peer ${id.slice(0, 6)}`;
                const stream = peerStreamById.get(id) ?? null;
                const sk = shareTileKeyForPeer(screenShareTiles, id);
                return (
                  <ParticipantVideoTile
                    key={id}
                    label={nm}
                    stream={stream}
                    cameraOff={p.cameraActive === false}
                    micOff={p.micActive === false}
                    imageUrl={p.image}
                    sharingScreen={screenShareTiles.some((t) => t.peerId === id)}
                    shareTileKey={sk}
                    shareIsFocused={Boolean(sk && focusedScreenShareKey === sk)}
                    onSelectShare={onSelectScreenShare}
                    allowPickShareFromTile={allowPickShareFromTile}
                  />
                );
              })
            : remoteIds.length > 0
              ? remoteIds.map((id) => {
                  const p = remotePeers[id]!;
                  const nm = p.displayName?.trim() || directPeerLabel.trim() || `Peer ${id.slice(0, 6)}`;
                  const sk = shareTileKeyForPeer(screenShareTiles, id);
                  return (
                    <ParticipantVideoTile
                      key={id}
                      label={nm}
                      stream={remotePeerCameraStream}
                      cameraOff={p.cameraActive === false || remotePeerCameraOff}
                      micOff={p.micActive === false || remotePeerMicOff}
                      imageUrl={p.image ?? directPeerAvatarUrl}
                      sharingScreen={screenShareTiles.some((t) => t.peerId === id)}
                      shareTileKey={sk}
                      shareIsFocused={Boolean(sk && focusedScreenShareKey === sk)}
                      onSelectShare={onSelectScreenShare}
                      allowPickShareFromTile={allowPickShareFromTile}
                    />
                  );
                })
              : directPeerLabel.trim()
                ? (
                    (() => {
                      const remoteShare = screenShareTiles.find((t) => t.peerId !== "local");
                      return (
                        <ParticipantVideoTile
                          label={directPeerLabel}
                          stream={remotePeerCameraStream}
                          cameraOff={remotePeerCameraOff}
                          micOff={remotePeerMicOff}
                          imageUrl={directPeerAvatarUrl}
                          sharingScreen={Boolean(remoteShare)}
                          shareTileKey={remoteShare?.key ?? null}
                          shareIsFocused={Boolean(
                            remoteShare && focusedScreenShareKey === remoteShare.key,
                          )}
                          onSelectShare={onSelectScreenShare}
                          allowPickShareFromTile={allowPickShareFromTile}
                        />
                      );
                    })()
                  )
                : null}
        </div>
      </section>
    </div>
  );
}
