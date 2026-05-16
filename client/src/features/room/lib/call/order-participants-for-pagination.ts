import type { RemoteParticipant } from "@/features/rtc";

/**
 * Puts `priorityPeerId` first among remotes (sticky anchor after silence), then higher
 * cumulative speaking time, so paginated grids keep that peer on page 1 with local at index 0.
 */
export function orderRemotesForPaginatedTiles(
  remotes: RemoteParticipant[],
  priorityPeerId: string | null | undefined,
  speakingMsByPeer: Record<string, number> | undefined,
): RemoteParticipant[] {
  if (remotes.length <= 1) return remotes;

  const times = speakingMsByPeer ?? {};
  const priority = priorityPeerId ?? null;

  return [...remotes].sort((a, b) => {
    const aId = a.peer.peerId;
    const bId = b.peer.peerId;
    if (priority) {
      if (aId === priority) return -1;
      if (bId === priority) return 1;
    }
    const byTime = (times[bId] ?? 0) - (times[aId] ?? 0);
    if (byTime !== 0) return byTime;
    return aId.localeCompare(bId);
  });
}

export function orderRemotePeerIdsForPaginatedTiles(
  remoteIds: string[],
  priorityPeerId: string | null | undefined,
  speakingMsByPeer: Record<string, number> | undefined,
): string[] {
  if (remoteIds.length <= 1) return remoteIds;

  const times = speakingMsByPeer ?? {};
  const priority = priorityPeerId ?? null;

  return [...remoteIds].sort((a, b) => {
    if (priority) {
      if (a === priority) return -1;
      if (b === priority) return 1;
    }
    const byTime = (times[b] ?? 0) - (times[a] ?? 0);
    if (byTime !== 0) return byTime;
    return a.localeCompare(b);
  });
}
