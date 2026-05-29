import type { ActiveCircleItem, FriendInvitedCircleItem } from "../types/circles-api.types";

/**
 * Friend invites stay `accepted` after join; joined/host circles must not also show as invited.
 */
export function filterFriendInvitedNotJoined(
  friendInvited: FriendInvitedCircleItem[],
  joined: ActiveCircleItem[],
): FriendInvitedCircleItem[] {
  const joinedIds = new Set(joined.map((c) => c.id));
  return friendInvited.filter((c) => !joinedIds.has(c.id));
}
