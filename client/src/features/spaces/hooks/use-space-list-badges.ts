"use client";

import { useCallback, useMemo } from "react";

import {
  FriendInvitedBadge,
  JoinedSpaceBadge,
} from "../components/active-space-card";
import type { ActiveSpaceItem } from "../types/spaces-api.types";

/**
 * Maps space ids to Invited / Joined badges for list UIs.
 */
export function useSpaceListBadges(
  friendInvited: ActiveSpaceItem[],
  joined: ActiveSpaceItem[],
) {
  const invitedIds = useMemo(
    () => new Set(friendInvited.map((c) => c.id)),
    [friendInvited],
  );
  const joinedIds = useMemo(() => new Set(joined.map((c) => c.id)), [joined]);

  const badgeForSpace = useCallback(
    (space: ActiveSpaceItem) => {
      if (invitedIds.has(space.id)) return FriendInvitedBadge;
      if (joinedIds.has(space.id)) return JoinedSpaceBadge;
      return null;
    },
    [invitedIds, joinedIds],
  );

  return {
    badgeForSpace,
    invitedBadge: FriendInvitedBadge,
    joinedBadge: JoinedSpaceBadge,
  };
}
