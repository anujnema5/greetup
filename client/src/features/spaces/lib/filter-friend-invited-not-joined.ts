import type { ActiveSpaceItem, FriendInvitedSpaceItem } from "../types/spaces-api.types";

/**
 * Friend invites stay `accepted` after join; joined/host circles must not also show as invited.
 */
export function filterFriendInvitedNotJoined(
  friendInvited: FriendInvitedSpaceItem[],
  joined: ActiveSpaceItem[],
): FriendInvitedSpaceItem[] {
  const joinedIds = new Set(joined.map((c) => c.id));
  return friendInvited.filter((c) => !joinedIds.has(c.id));
}
