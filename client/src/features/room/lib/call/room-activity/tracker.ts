export type RoomActivityShareMeta = {
  label: string;
  peerId: string | "local";
};

export type RoomActivityToastTracker = {
  peersInitialized: boolean;
  prevPeerKey: string;
  peerNames: Record<string, string>;
  sharesInitialized: boolean;
  prevShareKeys: Set<string>;
  shareMeta: Map<string, RoomActivityShareMeta>;
};

export function createRoomActivityToastTracker(): RoomActivityToastTracker {
  return {
    peersInitialized: false,
    prevPeerKey: "",
    peerNames: {},
    sharesInitialized: false,
    prevShareKeys: new Set(),
    shareMeta: new Map(),
  };
}

export function peerIdsFromStableKey(key: string): string[] {
  return key ? key.split("|").filter(Boolean) : [];
}
