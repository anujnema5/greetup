"use client";

import { useMemo } from "react";
import type { RemotePeer } from "@/features/rtc";

/** Header label + “camera off” state for the primary remote in 1:1 (or first roster peer). */
export function useRemoteParticipantLabel({
  peerId,
  peers,
  isGroupRoom,
}: {
  peerId: string | null;
  peers: Record<string, RemotePeer>;
  isGroupRoom: boolean;
}) {
  return useMemo(() => {
    const primaryId =
      (peerId && peers[peerId] ? peerId : null) ?? Object.keys(peers)[0] ?? null;
    const primaryPeer = primaryId ? peers[primaryId] : null;
    const peerLabel =
      primaryPeer?.displayName ??
      (primaryId ? `Peer ${primaryId.slice(0, 8)}…` : isGroupRoom ? "Participant" : "Partner");
    const remotePeerCameraOff = primaryPeer?.cameraActive === false;
    const remotePeerMicOff = primaryPeer?.micActive === false;
    const peerAvatarUrl = primaryPeer?.image ?? null;
    return { peerLabel, remotePeerCameraOff, remotePeerMicOff, peerAvatarUrl };
  }, [peerId, peers, isGroupRoom]);
}
