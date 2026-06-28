import { EXPLORE } from "@/lib/copy/user-messages";

import type { ActiveSpaceItem } from "@/features/spaces/types/spaces-api.types";
import type { BrowseNicheItem } from "../types/browse-niches.types";

/** Keep in sync with server `isRoomCategoryPickable`. */
const HIDDEN_NICHE_SLUGS = new Set(["match", "connection_call", "connection-call"]);

function normalizeCategorySlug(slug: string): string {
  return slug.trim().toLowerCase().replace(/-/g, "_").replace(/\s+/g, "_");
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

/** Short label for topic tiles (e.g. "12 spaces"). */
export function formatTopicSpaceCount(
  niche: Pick<BrowseNicheItem, "liveGroupCount" | "scheduledGroupCount">,
): string {
  const total = niche.liveGroupCount + niche.scheduledGroupCount;
  if (total === 0) return "No spaces yet";
  return total === 1 ? "1 space" : `${total} spaces`;
}

/** @deprecated Use formatTopicSpaceCount */
export function formatTopicCircleCount(
  niche: Pick<BrowseNicheItem, "liveGroupCount" | "scheduledGroupCount">,
): string {
  return formatTopicSpaceCount(niche);
}

export function partitionNicheRooms(rooms: readonly ActiveSpaceItem[]) {
  const live: ActiveSpaceItem[] = [];
  const scheduled: ActiveSpaceItem[] = [];

  for (const room of rooms) {
    if (room.status === "live") {
      live.push(room);
    } else if (room.status === "scheduled") {
      scheduled.push(room);
    }
  }

  return { live, scheduled };
}
