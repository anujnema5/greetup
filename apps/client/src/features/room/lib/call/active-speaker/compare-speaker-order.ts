/**
 * Shared sort for paginated camera grids: locked live speaker first, then longest
 * cumulative speaking time, then stable peer id.
 */
export function comparePeerIdsForLiveSpeakerGridOrder(
  aId: string,
  bId: string,
  speakerFirstPeerId: string | null,
  speakingMsByPeer: Record<string, number>,
): number {
  if (speakerFirstPeerId) {
    if (aId === speakerFirstPeerId) return -1;
    if (bId === speakerFirstPeerId) return 1;
  }
  const byTime = (speakingMsByPeer[bId] ?? 0) - (speakingMsByPeer[aId] ?? 0);
  if (byTime !== 0) return byTime;
  return aId.localeCompare(bId);
}
