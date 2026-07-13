"use client";

import { useMemo } from "react";

import {
  PROFILE_INSIGHTS_RECENT_MATCHES_LIMIT,
  useProfileInsights,
} from "@/features/profile/api/profile-insights.queries";

import { buildDashboardHeroStats } from "../lib/dashboard-display";

export function useDashboardInsights() {
  const query = useProfileInsights(
    { recentLimit: PROFILE_INSIGHTS_RECENT_MATCHES_LIMIT },
    {
      refetchOnMount: 'always',
      refetchOnWindowFocus: true,
    },
  );

  const heroStats = useMemo(
    () => buildDashboardHeroStats(query.data?.stats, query.data?.recentMatches),
    [query.data?.stats, query.data?.recentMatches],
  );

  const matchScoreByPeerId = useMemo(() => {
    const map = new Map<string, number>();
    for (const match of query.data?.recentMatches ?? []) {
      if (match.matchScore != null) {
        map.set(match.peerUserId, match.matchScore);
      }
    }
    return map;
  }, [query.data?.recentMatches]);

  return {
    insights: query.data,
    heroStats,
    matchScoreByPeerId,
    isLoading: query.isLoading,
    isFetching: query.isFetching,
  };
}
