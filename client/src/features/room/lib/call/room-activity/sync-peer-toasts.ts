import { toast } from "sonner";
import { remotePeerIdsStableKey } from "@/features/rtc";
import type { RemotePeer } from "@/features/rtc";
import type { RoomSessionType } from "@/shared/types/room-session";
import { ROOM_ACTIVITY_TOAST } from "@/features/room/constants/call/room-activity-toast-copy";
import { peerDisplayLabel, peerDisplayLabelById } from "./peer-label";
import { peerIdsFromStableKey, type RoomActivityToastTracker } from "./tracker";

const TOAST_ID = {
  join: (peerId: string) => `room-activity-join-${peerId}`,
  left: (peerId: string) => `room-activity-left-${peerId}`,
} as const;

/**
 * Diff peer roster vs last snapshot; toast join/leave after the initial baseline.
 */
export function syncPeerActivityToasts(
  tracker: RoomActivityToastTracker,
  peers: Record<string, RemotePeer>,
  rtcRoomType: RoomSessionType | null,
): void {
  const peerKey = remotePeerIdsStableKey(Object.keys(peers));

  for (const [id, peer] of Object.entries(peers)) {
    tracker.peerNames[id] = peerDisplayLabel(peer);
  }

  if (!tracker.peersInitialized) {
    tracker.peersInitialized = true;
    tracker.prevPeerKey = peerKey;
    return;
  }

  if (peerKey === tracker.prevPeerKey) return;

  const prevIds = peerIdsFromStableKey(tracker.prevPeerKey);
  const currIds = peerIdsFromStableKey(peerKey);
  const prevSet = new Set(prevIds);
  const currSet = new Set(currIds);
  const isDirectCall = rtcRoomType !== "circle";

  for (const id of currIds) {
    if (prevSet.has(id)) continue;
    toast.info(ROOM_ACTIVITY_TOAST.peerJoined(peerDisplayLabel(peers[id])), {
      id: TOAST_ID.join(id),
    });
  }

  for (const id of prevIds) {
    if (currSet.has(id)) continue;
    const name = peerDisplayLabelById(id, tracker.peerNames);
    const message =
      isDirectCall && currIds.length === 0
        ? ROOM_ACTIVITY_TOAST.partnerLeft
        : ROOM_ACTIVITY_TOAST.peerLeft(name);
    toast.info(message, { id: TOAST_ID.left(id) });
    delete tracker.peerNames[id];
  }

  tracker.prevPeerKey = peerKey;
}
