import type { ActiveSpaceItem, ActiveSpacesData, FriendInvitedSpaceItem } from "../types/spaces-api.types";
import { dedupeSpaces } from "./dedupe-spaces";
import { filterFriendInvitedNotJoined } from "./filter-friend-invited-not-joined";

export type ParsedSpacesBrowsePages = {
  friendInvited: FriendInvitedSpaceItem[];
  joined: ActiveSpaceItem[];
  discoverItems: ActiveSpaceItem[];
};

/**
 * First infinite-query page holds invited + joined lists; every page contributes
 * public discover items (deduped in order).
 */
export function parseBrowseSpacePages(
  pages: ActiveSpacesData[] | undefined,
): ParsedSpacesBrowsePages {
  const first = pages?.[0];
  const joined = first?.joined ?? [];
  const friendInvited = filterFriendInvitedNotJoined(
    first?.friendInvited ?? [],
    joined,
  );

  const mergedPublic: ActiveSpaceItem[] = [];
  for (const page of pages ?? []) {
    mergedPublic.push(...page.public.items);
  }

  return {
    friendInvited,
    joined,
    discoverItems: dedupeSpaces(mergedPublic),
  };
}
