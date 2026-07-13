import type { RemoteParticipant } from "@/features/rtc";
import { comparePeerIdsForLiveSpeakerGridOrder } from "./compare-speaker-order";

/**
 * Puts the locked live speaker first among remotes, then others by total speaking time,
 * so page 1 of a camera grid always shows who was talking (local tile stays index 0).
 */
export function sortParticipantsWithSpeakerFirst(
  participants: RemoteParticipant[],
  speakerFirstPeerId: string | null | undefined,
  speakingMsByPeer: Record<string, number> | undefined,
): RemoteParticipant[] {
  if (participants.length <= 1) return participants;

  const times = speakingMsByPeer ?? {};
  const firstId = speakerFirstPeerId ?? null;

  return [...participants].sort((a, b) =>
    comparePeerIdsForLiveSpeakerGridOrder(a.peer.peerId, b.peer.peerId, firstId, times),
  );
}

export function sortPeerIdsWithSpeakerFirst(
  peerIds: string[],
  speakerFirstPeerId: string | null | undefined,
  speakingMsByPeer: Record<string, number> | undefined,
): string[] {
  if (peerIds.length <= 1) return peerIds;

  const times = speakingMsByPeer ?? {};
  const firstId = speakerFirstPeerId ?? null;

  return [...peerIds].sort((a, b) =>
    comparePeerIdsForLiveSpeakerGridOrder(a, b, firstId, times),
  );
}
