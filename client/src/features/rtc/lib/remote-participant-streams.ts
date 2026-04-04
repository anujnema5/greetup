import type { RemoteParticipant, RemotePeer } from "@/features/rtc/types/mediasoup-room.types";

/**
 * Stable key for React effect deps — `remotePeerIds` arrays are often new references each render.
 * Assumes peer ids do not contain `|`.
 */
export function remotePeerIdsStableKey(peerIds: readonly string[]): string {
  if (peerIds.length === 0) return "";
  return [...peerIds].sort((a, b) => a.localeCompare(b)).join("|");
}

export function remotePeerCountFromStableKey(key: string): number {
  return key === "" ? 0 : key.split("|").length;
}

/** Sorted copy — stable member lists from signaling (`peerJoined` / `join`). */
export function sortPeerIds(ids: string[]): string[] {
  return [...ids].sort((a, b) => a.localeCompare(b));
}

/** Add a track to the stream bucket for `peerId` (new `MediaStream` when needed). */
export function addRemoteTrackForPeer(
  byPeer: Record<string, MediaStream>,
  peerId: string,
  track: MediaStreamTrack,
): Record<string, MediaStream> {
  const existing = byPeer[peerId];
  const tracks = existing ? [...existing.getTracks()] : [];
  if (tracks.includes(track)) return byPeer;
  return {
    ...byPeer,
    [peerId]: new MediaStream([...tracks, track]),
  };
}

/** Remove a track from whichever peer bucket contains it; drop empty buckets. */
export function removeRemoteTrackFromPeers(
  byPeer: Record<string, MediaStream>,
  track: MediaStreamTrack,
): Record<string, MediaStream> {
  for (const [pid, stream] of Object.entries(byPeer)) {
    if (!stream.getTracks().includes(track)) continue;
    const next = { ...byPeer };
    const remaining = stream.getTracks().filter((t) => t !== track);
    if (remaining.length === 0) delete next[pid];
    else next[pid] = new MediaStream(remaining);
    return next;
  }
  return byPeer;
}

export function remoteParticipantsFromRecord(
  byPeer: Record<string, MediaStream>,
  peers: Record<string, RemotePeer>,
): RemoteParticipant[] {
  return Object.entries(byPeer)
    .map(([peerId, stream]) => ({
      peer: peers[peerId] ?? { peerId },
      stream,
    }))
    .sort((a, b) => a.peer.peerId.localeCompare(b.peer.peerId));
}

/**
 * Circle / group gallery: include everyone in the signaling roster, not only peers who already
 * have consumed tracks. Otherwise both sides see “waiting” while camera/mic are still off.
 */
export function mergeGroupGalleryParticipants(
  peers: Record<string, RemotePeer>,
  withStreams: RemoteParticipant[],
): RemoteParticipant[] {
  const streamByPeerId = new Map(withStreams.map((p) => [p.peer.peerId, p.stream]));
  const ids = sortPeerIds([
    ...new Set([...Object.keys(peers), ...withStreams.map((p) => p.peer.peerId)]),
  ]);
  return ids.map((peerId) => ({
    peer: peers[peerId] ?? { peerId },
    stream: streamByPeerId.get(peerId) ?? new MediaStream(),
  }));
}

/**
 * Stream for the main remote tile: explicit focus id, else sole remote, else first stable order.
 * For true gallery mode, bind one `<video>` per {@link remoteParticipantsFromRecord} entry instead.
 */
export function pickPrimaryRemoteStream(
  participants: RemoteParticipant[],
  preferredPeerId: string | null | undefined,
): MediaStream | null {
  if (participants.length === 0) return null;
  if (preferredPeerId) {
    const hit = participants.find((p) => p.peer.peerId === preferredPeerId);
    if (hit) return hit.stream;
  }
  return participants[0]!.stream;
}
