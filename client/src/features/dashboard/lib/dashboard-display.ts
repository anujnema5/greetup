import type {
  ProfileInsightsData,
  ProfileInsightsStats,
} from "@/features/profile/types/profile-insights.types";

export type DashboardHeroStats = {
  matchCount: number;
  profileCompletion: number | null;
  peopleToConnect: number;
  alignedMatchCount: number;
};

export function buildDashboardHeroStats(
  stats: ProfileInsightsStats | undefined,
  recentMatches: ProfileInsightsData["recentMatches"] | undefined,
): DashboardHeroStats {
  const matches = recentMatches ?? [];
  const alignedMatchCount = matches.filter(
    (match) => match.matchScore != null && match.matchScore >= 70,
  ).length;

  const profileCompletion =
    stats?.profileCompletion != null && Number.isFinite(stats.profileCompletion)
      ? Math.round(Math.min(100, Math.max(0, stats.profileCompletion)))
      : null;

  return {
    matchCount: stats?.matchCount ?? 0,
    profileCompletion,
    peopleToConnect: matches.filter((match) => !match.isConnected).length,
    alignedMatchCount: alignedMatchCount > 0 ? alignedMatchCount : (stats?.matchCount ?? 0),
  };
}

export function formatDashboardCount(value: number): string {
  return value.toLocaleString();
}
