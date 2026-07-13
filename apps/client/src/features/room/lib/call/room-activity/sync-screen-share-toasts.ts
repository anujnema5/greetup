import { toast } from "sonner";
import type { ScreenShareTileInfo } from "@/features/rtc";
import { ROOM_ACTIVITY_TOAST } from "@/features/room/constants/call/room-activity-toast-copy";
import type { RoomActivityToastTracker } from "./tracker";

const TOAST_ID = {
  start: (key: string) => `room-activity-share-start-${key}`,
  stop: (key: string) => `room-activity-share-stop-${key}`,
} as const;

/**
 * Diff screen-share tiles vs last snapshot; toast start/stop after the initial baseline.
 */
export function syncScreenShareActivityToasts(
  tracker: RoomActivityToastTracker,
  screenShareTiles: ScreenShareTileInfo[],
): void {
  const currKeys = new Set(screenShareTiles.map((tile) => tile.key));

  for (const tile of screenShareTiles) {
    tracker.shareMeta.set(tile.key, { label: tile.label, peerId: tile.peerId });
  }

  if (!tracker.sharesInitialized) {
    tracker.sharesInitialized = true;
    tracker.prevShareKeys = currKeys;
    return;
  }

  for (const tile of screenShareTiles) {
    if (tracker.prevShareKeys.has(tile.key)) continue;
    const message =
      tile.peerId === "local"
        ? ROOM_ACTIVITY_TOAST.youScreenShareStarted
        : ROOM_ACTIVITY_TOAST.screenShareStarted(tile.label);
    toast.info(message, { id: TOAST_ID.start(tile.key) });
  }

  for (const key of tracker.prevShareKeys) {
    if (currKeys.has(key)) continue;
    const meta = tracker.shareMeta.get(key);
    const message =
      meta?.peerId === "local"
        ? ROOM_ACTIVITY_TOAST.youScreenShareStopped
        : ROOM_ACTIVITY_TOAST.screenShareStopped(meta?.label ?? "Someone");
    toast.info(message, { id: TOAST_ID.stop(key) });
    tracker.shareMeta.delete(key);
  }

  tracker.prevShareKeys = currKeys;
}
