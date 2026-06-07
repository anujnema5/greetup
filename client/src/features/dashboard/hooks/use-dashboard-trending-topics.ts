"use client";

import { useMemo } from "react";

import { useMyProfile } from "@/features/profile-setup/api";

const TRENDING_TOPICS_LIMIT = 6;

export function useDashboardTrendingTopics(limit = TRENDING_TOPICS_LIMIT) {
  const query = useMyProfile({ refetchOnMount: 'always' });

  const topics = useMemo(() => {
    const interests = query.data?.interests ?? [];
    return interests.slice(0, limit).map((interest) => interest.displayName);
  }, [limit, query.data?.interests]);

  return {
    topics,
    isLoading: query.isLoading,
  };
}
