/**
 * Multi-participant screen sharing: collect tiles, stable "latest" ordering, and main-stage composition.
 */

import {
  inboundVideoTrackIsSfuScreenShare,
  pickPrimaryParticipantCameraVideoTrack,
  trackEligibleForParticipantCameraTile,
} from "@/features/rtc/lib/mediasoup-stream-helpers";
import type { ProducerMediaSource, RemotePeer, ScreenShareTileInfo } from "@/features/rtc/types/mediasoup-room.types";

export const SCREEN_SHARE_LOCAL_PREFIX = "local:" as const;

export function makeLocalScreenShareKey(trackId: string): string {
  return `${SCREEN_SHARE_LOCAL_PREFIX}${trackId}`;
}

export function makeRemoteScreenShareKey(peerId: string, trackId: string): string {
  return `${peerId}:${trackId}`;
}

export function parseScreenShareKey(key: string): { kind: "local"; trackId: string } | { kind: "remote"; peerId: string; trackId: string } {
  if (key.startsWith(SCREEN_SHARE_LOCAL_PREFIX)) {
    return { kind: "local", trackId: key.slice(SCREEN_SHARE_LOCAL_PREFIX.length) };
  }
  const colon = key.indexOf(":");
  if (colon <= 0) return { kind: "remote", peerId: key, trackId: "" };
  return { kind: "remote", peerId: key.slice(0, colon), trackId: key.slice(colon + 1) };
}

function liveScreenTracks(
  stream: MediaStream,
  remoteTrackMediaSource: Record<string, ProducerMediaSource>,
): MediaStreamTrack[] {
  return stream.getVideoTracks().filter(
    (t) =>
      t.readyState === "live" && inboundVideoTrackIsSfuScreenShare(t, remoteTrackMediaSource[t.id]),
  );
}

export function collectScreenShareTiles(input: {
  localUserLabel: string;
  screenSharing: boolean;
  localStream: MediaStream | null;
  localScreenTrackId: string | null;
  remoteStreamsByPeerId: Record<string, MediaStream>;
  remoteTrackMediaSource: Record<string, ProducerMediaSource>;
  peers: Record<string, RemotePeer>;
}): ScreenShareTileInfo[] {
  const out: ScreenShareTileInfo[] = [];
  const {
    localUserLabel,
    screenSharing,
    localStream,
    localScreenTrackId,
    remoteStreamsByPeerId,
    remoteTrackMediaSource,
    peers,
  } = input;

  if (screenSharing && localStream && localScreenTrackId) {
    const t = localStream.getVideoTracks().find((x) => x.id === localScreenTrackId);
    if (t && t.readyState === "live") {
      out.push({
        key: makeLocalScreenShareKey(t.id),
        peerId: "local",
        label: `${localUserLabel} (screen)`,
        stream: new MediaStream([t]),
      });
    }
  }

  for (const peerId of Object.keys(remoteStreamsByPeerId).sort((a, b) => a.localeCompare(b))) {
    const stream = remoteStreamsByPeerId[peerId]!;
    for (const t of liveScreenTracks(stream, remoteTrackMediaSource)) {
      const peer = peers[peerId];
      const name = peer?.displayName?.trim() || `Peer ${peerId.slice(0, 6)}`;
      out.push({
        key: makeRemoteScreenShareKey(peerId, t.id),
        peerId,
        label: `${name} (screen)`,
        stream: new MediaStream([t]),
      });
    }
  }

  return out;
}

/** Video track ids already routed to screen-share UI for this peer — never attach them to camera tiles. */
export function videoTrackIdsFromScreenShareTilesForPeer(
  tiles: ScreenShareTileInfo[],
  peerId: string,
): Set<string> {
  const s = new Set<string>();
  for (const tile of tiles) {
    if (tile.peerId !== peerId) continue;
    for (const t of tile.stream.getVideoTracks()) {
      if (t.kind === "video") s.add(t.id);
    }
  }
  return s;
}

/** Deterministic key list for set-diff when merging arrival order in the mediasoup room hook. */
export function stableSortedScreenShareKeys(tiles: ScreenShareTileInfo[]): string[] {
  return tiles.map((t) => t.key).sort((a, b) => a.localeCompare(b));
}

export function effectiveScreenShareFocusKey(
  userPinned: string | null,
  orderedKeys: readonly string[],
): string | null {
  if (orderedKeys.length === 0) return null;
  if (userPinned && orderedKeys.includes(userPinned)) return userPinned;
  return orderedKeys[orderedKeys.length - 1] ?? null;
}

export function buildMainStageStreamForScreenFocus(input: {
  focusKey: string | null;
  tiles: ScreenShareTileInfo[];
  audioSourceStream: MediaStream | null;
}): MediaStream | null {
  const { focusKey, tiles, audioSourceStream } = input;
  if (!focusKey) return null;
  const tile = tiles.find((t) => t.key === focusKey);
  if (!tile) return null;
  const v = tile.stream.getVideoTracks()[0];
  if (!v || v.readyState !== "live") return null;
  const audios = audioSourceStream?.getAudioTracks().filter((a) => a.readyState === "live") ?? [];
  return new MediaStream([v, ...audios]);
}

/**
 * Direct call: camera inset beside a screen — whose camera depends on which screen share is focused.
 */
function pickParticipantCameraVideoFromStream(
  stream: MediaStream,
  remoteTrackMediaSource: Record<string, ProducerMediaSource>,
  excludeVideoTrackIds?: ReadonlySet<string>,
): MediaStreamTrack | null {
  let videos = stream.getVideoTracks();
  if (videos.length === 0) return null;
  if (excludeVideoTrackIds && excludeVideoTrackIds.size > 0) {
    const kept = videos.filter((t) => !excludeVideoTrackIds.has(t.id));
    if (kept.length > 0) videos = kept;
  }
  return pickPrimaryParticipantCameraVideoTrack(videos, remoteTrackMediaSource);
}

export function buildDirectPeerCameraInsetForScreenFocus(input: {
  focusedShareKey: string | null;
  primaryRemoteStream: MediaStream | null;
  remoteStreamsByPeerId: Record<string, MediaStream>;
  remoteTrackMediaSource: Record<string, ProducerMediaSource>;
  screenShareTiles?: ScreenShareTileInfo[];
}): MediaStream | null {
  const {
    focusedShareKey,
    primaryRemoteStream,
    remoteStreamsByPeerId,
    remoteTrackMediaSource,
    screenShareTiles = [],
  } = input;
  if (!focusedShareKey) return null;

  const parsed = parseScreenShareKey(focusedShareKey);
  if (parsed.kind === "local") {
    if (!primaryRemoteStream) return null;
    const cam = pickParticipantCameraVideoFromStream(primaryRemoteStream, remoteTrackMediaSource);
    return cam ? new MediaStream([cam]) : null;
  }

  let excludeVideo: Set<string> | undefined;
  if (screenShareTiles.length > 0) {
    excludeVideo = videoTrackIdsFromScreenShareTilesForPeer(screenShareTiles, parsed.peerId);
  }
  if ((!excludeVideo || excludeVideo.size === 0) && parsed.trackId) {
    excludeVideo = new Set([parsed.trackId]);
  }

  const stream = remoteStreamsByPeerId[parsed.peerId];
  if (!stream) {
    if (!primaryRemoteStream) return null;
    const cam = pickParticipantCameraVideoFromStream(
      primaryRemoteStream,
      remoteTrackMediaSource,
      excludeVideo,
    );
    return cam ? new MediaStream([cam]) : null;
  }
  const cam = pickParticipantCameraVideoFromStream(stream, remoteTrackMediaSource, excludeVideo);
  return cam ? new MediaStream([cam]) : null;
}

export type CameraOnlyParticipantStreamOpts = {
  /** Video track ids reserved for screen-share UI for this peer (omit from camera stream). */
  excludeVideoTrackIds?: ReadonlySet<string>;
};

/** One camera video + audio for roster/gallery; main stage keeps screen shares. */
export function cameraOnlyParticipantStream(
  stream: MediaStream,
  remoteTrackMediaSource: Record<string, ProducerMediaSource>,
  opts?: CameraOnlyParticipantStreamOpts,
): MediaStream {
  const audios = stream.getAudioTracks();
  let videos = stream.getVideoTracks();
  const excludeIds = opts?.excludeVideoTrackIds;
  if (excludeIds && excludeIds.size > 0) {
    const kept = videos.filter((t) => !excludeIds.has(t.id));
    if (kept.length > 0) videos = kept;
  }
  if (videos.length === 0) {
    return new MediaStream([...audios]);
  }
  // After removing SFU `screen`, a single remaining track is the webcam (skip further heuristics).
  const withoutExplicitScreen = videos.filter((t) => remoteTrackMediaSource[t.id] !== "screen");
  const workset = withoutExplicitScreen.length > 0 ? withoutExplicitScreen : videos;
  let cam: MediaStreamTrack | null;
  if (workset.length === 1) {
    cam = workset[0]!;
  } else {
    const candidates = workset.filter((t) =>
      trackEligibleForParticipantCameraTile(t, remoteTrackMediaSource[t.id]),
    );
    const pool = candidates.length > 0 ? candidates : workset;
    cam = pickPrimaryParticipantCameraVideoTrack(pool, remoteTrackMediaSource);
  }
  const tracks: MediaStreamTrack[] = [...audios];
  if (cam) tracks.push(cam);
  return new MediaStream(tracks);
}

export function mainStageIsScreenShareVideo(
  focusKey: string | null,
  tiles: ScreenShareTileInfo[],
): boolean {
  if (!focusKey) return false;
  return tiles.some((t) => t.key === focusKey);
}
