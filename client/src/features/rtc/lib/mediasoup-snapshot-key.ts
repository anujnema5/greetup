import { mediaStreamVideoAttachRevision } from "./media-stream-utils";
import type { RemoteParticipant, RemotePeer, UseMediasoupRoomReturn } from "../types/mediasoup-room.types";

function peerMediaActivityKey(peers: Record<string, RemotePeer>): string {
  return Object.keys(peers)
    .sort((a, b) => a.localeCompare(b))
    .map((id) => {
      const peer = peers[id]!;
      const cam = peer.cameraActive === undefined ? "u" : peer.cameraActive ? "1" : "0";
      const mic = peer.micActive === undefined ? "u" : peer.micActive ? "1" : "0";
      return `${id}:${cam}${mic}`;
    })
    .join(";");
}

function remoteParticipantsKey(participants: RemoteParticipant[]): string {
  return [...participants]
    .sort((a, b) => a.peer.peerId.localeCompare(b.peer.peerId))
    .map((participant) => {
      const { peer, stream } = participant;
      const audio = stream
        .getAudioTracks()
        .map((track) => `${track.id}:${track.readyState}:${track.enabled ? 1 : 0}:${track.muted ? 1 : 0}`)
        .join("+");
      return [
        peer.peerId,
        stream.id,
        mediaStreamVideoAttachRevision(stream),
        audio,
      ].join(":");
    })
    .join(";");
}

/** Stable key for mediasoup room state — ignores function identity and object churn. */
export function getMediasoupSnapshotKey(state: UseMediasoupRoomReturn): string {
  return [
    state.status,
    state.error ?? "",
    state.micEnabled,
    state.cameraEnabled,
    state.screenSharing,
    state.localScreenTrackId ?? "",
    state.mainStageShowsScreen,
    state.localMediaDeviceError ?? "",
    state.focusedScreenShareKey ?? "",
    state.dominantSpeakerPeerId ?? "",
    mediaStreamVideoAttachRevision(state.localStream),
    mediaStreamVideoAttachRevision(state.localPreviewStream),
    mediaStreamVideoAttachRevision(state.remoteStream),
    mediaStreamVideoAttachRevision(state.remotePeerCameraStream),
    peerMediaActivityKey(state.peers),
    remoteParticipantsKey(state.remoteParticipants),
    state.screenShareTiles.map((tile) => tile.key).join(","),
    JSON.stringify(state.dominantSpeakerSpeakingMs),
    JSON.stringify(state.remoteTrackMediaSource),
  ].join("|");
}
