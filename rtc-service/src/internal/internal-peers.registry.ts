import type { PeerSessionService } from "@/peers/peer.service";

let peersRef: PeerSessionService | null = null;

export const registerInternalPeers = (peers: PeerSessionService): void => {
  peersRef = peers;
};

export const getInternalPeers = (): PeerSessionService | null => peersRef;
