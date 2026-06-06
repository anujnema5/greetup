"use client";

import { useMemo } from "react";

import { useListActiveCircles } from "@/features/circles/api/circles.queries";
import { activeCircleCardShowsLiveSession } from "@/features/circles/lib/active-circle-card-session-display";
import { dedupeCircles } from "@/features/circles/lib/dedupe-circles";
import type { ActiveCircleItem } from "@/features/circles/types/circles-api.types";

const ACTIVE_NOW_LIMIT = 4;

export function useDashboardActiveNowCircles(limit = ACTIVE_NOW_LIMIT) {
  const query = useListActiveCircles();

  const circles = useMemo(() => {
    const apiData = query.data;
    if (!apiData) return [] as ActiveCircleItem[];

    const combined = dedupeCircles([
      ...apiData.friendInvited,
      ...apiData.joined,
      ...apiData.public.items,
    ]);

    return combined
      .filter(activeCircleCardShowsLiveSession)
      .sort((a, b) => b.participantCount - a.participantCount)
      .slice(0, limit);
  }, [limit, query.data]);

  return {
    circles,
    isLoading: query.isLoading,
    isFetching: query.isFetching,
  };
}
