import type { RoomActivityMeta } from "@/features/room/types/room-activity.types";

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
