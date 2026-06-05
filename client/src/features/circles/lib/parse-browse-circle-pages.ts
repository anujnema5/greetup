import type { ActiveCircleItem, ActiveCirclesData, FriendInvitedCircleItem } from "../types/circles-api.types";
import { dedupeCircles } from "./dedupe-circles";
import { filterFriendInvitedNotJoined } from "./filter-friend-invited-not-joined";

export type ParsedCirclesBrowsePages = {
  friendInvited: FriendInvitedCircleItem[];
  joined: ActiveCircleItem[];
  discoverItems: ActiveCircleItem[];
};

/**
 * First infinite-query page holds invited + joined lists; every page contributes
 * public discover items (deduped in order).
 */
export function parseBrowseCirclePages(
  pages: ActiveCirclesData[] | undefined,
): ParsedCirclesBrowsePages {
  const first = pages?.[0];
  const joined = first?.joined ?? [];
  const friendInvited = filterFriendInvitedNotJoined(
    first?.friendInvited ?? [],
    joined,
  );

  const mergedPublic: ActiveCircleItem[] = [];
  for (const page of pages ?? []) {
    mergedPublic.push(...page.public.items);
  }

  return {
    friendInvited,
    joined,
    discoverItems: dedupeCircles(mergedPublic),
  };
}
