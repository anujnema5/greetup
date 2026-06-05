"use client";

import { useCallback, useMemo } from "react";

import {
  FriendInvitedBadge,
  JoinedCircleBadge,
} from "../components/active-circle-card";
import type { ActiveCircleItem } from "../types/circles-api.types";

/**
 * Maps circle ids to Invited / Joined badges for list UIs.
 */
export function useCircleListBadges(
  friendInvited: ActiveCircleItem[],
  joined: ActiveCircleItem[],
) {
  const invitedIds = useMemo(
    () => new Set(friendInvited.map((c) => c.id)),
    [friendInvited],
  );
  const joinedIds = useMemo(() => new Set(joined.map((c) => c.id)), [joined]);

  const badgeForCircle = useCallback(
    (circle: ActiveCircleItem) => {
      if (invitedIds.has(circle.id)) return FriendInvitedBadge;
      if (joinedIds.has(circle.id)) return JoinedCircleBadge;
      return null;
    },
    [invitedIds, joinedIds],
  );

  return {
    badgeForCircle,
    invitedBadge: FriendInvitedBadge,
    joinedBadge: JoinedCircleBadge,
  };
}
