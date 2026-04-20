"use client";

import { useMemo } from "react";
import type { RemotePeer } from "@/features/rtc";

/** Header label + “camera off” state for the primary remote in 1:1 (or first roster peer). */
export function useRoomPeerChrome({
  peerId,
  peers,
  isGroupRoom,
  groupRoomTitle,
}: {
  peerId: string | null;
  peers: Record<string, RemotePeer>;
  isGroupRoom: boolean;
  groupRoomTitle: string | null;
}) {
  return useMemo(() => {
    const primaryId =
      (peerId && peers[peerId] ? peerId : null) ?? Object.keys(peers)[0] ?? null;
    const primaryPeer = primaryId ? peers[primaryId] : null;
    const directPeerLabel =
      primaryPeer?.displayName ??
      (primaryId ? `Peer ${primaryId.slice(0, 8)}…` : "Searching for next match...");
    const peerLabel =
      isGroupRoom && groupRoomTitle?.trim()
        ? groupRoomTitle.trim()
        : isGroupRoom
          ? "Circle"
          : directPeerLabel;
    const remotePeerCameraOff = primaryPeer?.cameraActive === false;
    const peerAvatarUrl = primaryPeer?.image ?? null;
    return { peerLabel, remotePeerCameraOff, peerAvatarUrl };
  }, [peerId, peers, isGroupRoom, groupRoomTitle]);
}
