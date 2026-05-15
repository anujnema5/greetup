/**
 * Pure helpers for minimized dock: who gets the main tile (pin → dominant → fallback).
 * Streams stay in the hook — this module is easy to unit-test later if needed.
 */
import { pickPrimaryParticipantCameraVideoTrack } from "@/features/rtc/lib/mediasoup-stream-helpers";
import type {
  ProducerMediaSource,
  RemoteParticipant,
} from "@/features/rtc/types/mediasoup-room.types";

/**
 * One dock `<video>` must not bind multiple inbound video tracks — decoders often show black
 * (same rule as {@link buildLocalPreviewStream} for local).
 */
export function playbackStreamForDockVideo(
  stream: MediaStream | null,
  remoteTrackMediaSource: Record<string, ProducerMediaSource>,
): MediaStream | null {
  if (!stream) return null;
  const videos = stream.getVideoTracks();
  const audios = stream.getAudioTracks();
  if (videos.length <= 1) return stream;
  const chosen =
    pickPrimaryParticipantCameraVideoTrack(videos, remoteTrackMediaSource) ?? videos[0]!;
  return new MediaStream([chosen, ...audios]);
}

/** Mic-dominant debounce — reduces rapid tile swaps in cross-talk. */
export const MINIMIZED_DOCK_DOMINANT_DEBOUNCE_MS = 380;

/** Strict match — no fallback (callers combine with roster fallback). */
export function findRemoteParticipant(
  participants: readonly RemoteParticipant[],
  peerId: string | null | undefined,
): RemoteParticipant | null {
  if (!peerId) return null;
  return participants.find((p) => p.peer.peerId === peerId) ?? null;
}

/** Remote tile for dock focus: exact peer, or first remote if they left the roster. */
export function resolveFocusedRemoteParticipant(
  participants: readonly RemoteParticipant[],
  focusPeerId: string | null,
  currentUserId: string | null,
): RemoteParticipant | null {
  if (!focusPeerId || focusPeerId === currentUserId) return participants[0] ?? null;
  return findRemoteParticipant(participants, focusPeerId) ?? participants[0] ?? null;
}

export function firstRemoteParticipantExcluding(
  participants: readonly RemoteParticipant[],
  excludePeerId: string | null | undefined,
): RemoteParticipant | null {
  if (!excludePeerId) return participants[0] ?? null;
  const other = participants.find((p) => p.peer.peerId !== excludePeerId);
  return other ?? null;
}

export function peerDisplayLabel(peerId: string, participant: RemoteParticipant | null): string {
  const name = participant?.peer.displayName?.trim();
  if (name) return name;
  return `Peer ${peerId.slice(0, 6)}`;
}
