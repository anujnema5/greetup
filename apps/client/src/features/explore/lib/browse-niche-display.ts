import { EXPLORE } from "@/lib/copy/user-messages";

import type { ActiveSpaceItem } from "@/features/spaces/types/spaces-api.types";
import type { BrowseNicheItem } from "../types/browse-niches.types";

/** Keep in sync with server `SYSTEM_ROOM_CATEGORY_SLUGS` — system rooms are personal, not niches. */
const HIDDEN_NICHE_SLUGS = new Set([
  "match",
  "connection",
  "connection_call",
  "connection-call",
]);

const HIDDEN_NICHE_LABELS = new Set(["match", "connection call"]);

function normalizeCategorySlug(slug: string): string {
  return slug.trim().toLowerCase().replace(/-/g, "_").replace(/\s+/g, "_");
}

export function isBrowseNichePickable(slug: string, displayName?: string): boolean {
  if (HIDDEN_NICHE_SLUGS.has(normalizeCategorySlug(slug))) return false;
  if (displayName && HIDDEN_NICHE_LABELS.has(displayName.trim().toLowerCase())) return false;
  return true;
}

export function filterBrowseNiches(niches: readonly BrowseNicheItem[]): BrowseNicheItem[] {
  return niches.filter((n) => isBrowseNichePickable(n.slug, n.displayName));
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
