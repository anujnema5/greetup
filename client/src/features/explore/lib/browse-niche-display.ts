import { EXPLORE } from "@/lib/copy/user-messages";

import type { ActiveCircleItem } from "@/features/circles/types/circles-api.types";
import type { BrowseNicheItem } from "../types/browse-niches.types";

/** Keep in sync with server `isRoomCategoryPickable`. */
const HIDDEN_NICHE_SLUGS = new Set(["match", "connection_call", "connection-call"]);

function normalizeCategorySlug(slug: string): string {
  return slug.trim().toLowerCase().replace(/-/g, "_");
}

export function isBrowseNichePickable(slug: string): boolean {
  return !HIDDEN_NICHE_SLUGS.has(normalizeCategorySlug(slug));
}

export function filterBrowseNiches(niches: readonly BrowseNicheItem[]): BrowseNicheItem[] {
  return niches.filter((n) => isBrowseNichePickable(n.slug));
}

export function formatNicheGroupCounts(niche: Pick<BrowseNicheItem, "liveGroupCount" | "scheduledGroupCount">): string {
  return EXPLORE.browseNiches.groupCounts(niche.liveGroupCount, niche.scheduledGroupCount);
}

export function partitionNicheRooms(rooms: readonly ActiveCircleItem[]) {
  const live: ActiveCircleItem[] = [];
  const scheduled: ActiveCircleItem[] = [];

  for (const room of rooms) {
    if (room.status === "live") {
      live.push(room);
    } else if (room.status === "scheduled") {
      scheduled.push(room);
    }
  }

  return { live, scheduled };
}
