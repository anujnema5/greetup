"use client";

import { useMemo } from "react";

import { useListActiveSpaces } from "@/features/spaces/api/spaces.queries";
import { activeSpaceCardShowsLiveSession } from "@/features/spaces/lib/active-space-card-session-display";
import { dedupeSpaces } from "@/features/spaces/lib/dedupe-spaces";
import type { ActiveSpaceItem } from "@/features/spaces/types/spaces-api.types";

const ACTIVE_NOW_LIMIT = 4;

export function useDashboardActiveNowSpaces(limit = ACTIVE_NOW_LIMIT) {
  const query = useListActiveSpaces();

  const spaces = useMemo(() => {
    const apiData = query.data;
    if (!apiData) return [] as ActiveSpaceItem[];

    const combined = dedupeSpaces([
      ...apiData.friendInvited,
      ...apiData.joined,
      ...apiData.public.items,
    ]);

    return combined
      .filter(activeSpaceCardShowsLiveSession)
      .sort((a, b) => b.participantCount - a.participantCount)
      .slice(0, limit);
  }, [limit, query.data]);

  return {
    spaces,
    isLoading: query.isLoading,
    isFetching: query.isFetching,
  };
}
