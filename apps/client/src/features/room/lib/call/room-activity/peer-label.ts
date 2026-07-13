import type { RemotePeer } from "@/features/rtc";

export function peerDisplayLabel(
  peer: RemotePeer | null | undefined,
  fallback = "Someone",
): string {
  const name = peer?.displayName?.trim();
  return name || fallback;
}

export function peerDisplayLabelById(
  peerId: string,
  namesByPeerId: Record<string, string>,
): string {
  const cached = namesByPeerId[peerId]?.trim();
  if (cached) return cached;
  return `Peer ${peerId.slice(0, 8)}…`;
}
