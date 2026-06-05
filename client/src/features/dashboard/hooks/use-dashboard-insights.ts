"use client";

import { useMemo } from "react";

import { useGetProfileInsightsQuery } from "@/features/profile/api/profile-insights-api";

import { buildDashboardHeroStats } from "../lib/dashboard-display";

export function useDashboardInsights() {
  const query = useGetProfileInsightsQuery(undefined, {
    refetchOnMountOrArgChange: true,
    refetchOnFocus: true,
  });

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
