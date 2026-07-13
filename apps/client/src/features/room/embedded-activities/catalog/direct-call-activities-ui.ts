import type { RoomActivityMeta } from "@/features/room/types/call/room-activity.types";

/**
 * Direct-call Activities tab + toolbar controls: only when the API returns at least one tile with
 * `is_active` (see `useRoomEmbeddedActivitiesCatalog`). Circles never show this tab.
 */
export function shouldShowDirectCallActivitiesTab(
  isGroupRoom: boolean,
  activeCatalogTiles: readonly RoomActivityMeta[],
): boolean {
  return !isGroupRoom && activeCatalogTiles.length > 0;
}

export type CallActivitiesSessionInput = {
  isMatchSession: boolean;
  isConnectionCallSession: boolean;
  /** True once the RTC roster has a remote peer. */
  hasConnectedRemotePeer: boolean;
};

/**
 * Session kinds that get the Activities tab: matches (incl. open-to-connect) always; connection
 * calls only after the callee joins — the caller sits alone in the room while it rings, and the
 * callee only becomes a room participant on accept (invites would 400 with `PEER_NOT_FOUND`).
 */
export function sessionAllowsCallActivities(input: CallActivitiesSessionInput): boolean {
  if (input.isMatchSession) return true;
  return input.isConnectionCallSession && input.hasConnectedRemotePeer;
}
