import type { PeerSessionService } from "@/modules/rtc/peer/peer.service";

let peersRef: PeerSessionService | null = null;

export const registerInternalPeers = (peers: PeerSessionService): void => {
  peersRef = peers;
};

export const getInternalPeers = (): PeerSessionService | null => peersRef;
